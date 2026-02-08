import { LIMITS } from "../config/constants";
import { findAllRunningSessionContainers } from "../repositories/container-session.repository";
import { CircularBuffer } from "../shared/circular-buffer";
import { RateLimiter } from "../shared/rate-limiter";
import type { Sandbox, Publisher } from "../types/dependencies";
import type { DeferredPublisher } from "../shared/deferred-publisher";
import { widelog } from "../logging";

type LogChunk = {
  stream: "stdout" | "stderr";
  data: Uint8Array;
};

type LogSource = {
  id: string;
  hostname: string;
  runtimeId: string;
  status: "streaming" | "stopped" | "error";
};

type LogEntry = {
  containerId: string;
  stream: "stdout" | "stderr";
  text: string;
  timestamp: number;
};

class LogStreamTracker {
  private abortController: AbortController | null = null;
  private buffer: CircularBuffer<LogEntry>;
  private rateLimiter: RateLimiter;
  private isStreaming = false;

  constructor(
    public readonly containerId: string,
    public readonly sessionId: string,
    public readonly runtimeId: string,
    public readonly hostname: string,
    private readonly sandbox: Sandbox,
    private readonly getPublisher: () => Publisher,
  ) {
    this.buffer = new CircularBuffer(LIMITS.LOG_BUFFER_SIZE);
    this.rateLimiter = new RateLimiter(LIMITS.LOG_LINES_PER_SECOND);
  }

  async start(): Promise<void> {
    if (this.isStreaming) return;

    this.abortController = new AbortController();
    this.isStreaming = true;

    this.runStreamLoop().catch(() => {});
  }

  stop(): void {
    this.isStreaming = false;
    this.abortController?.abort();
    this.abortController = null;
  }

  getBufferedLogs(): LogEntry[] {
    return this.buffer.getAll();
  }

  getSource(): LogSource {
    return {
      id: this.containerId,
      hostname: this.hostname,
      runtimeId: this.runtimeId,
      status: this.isStreaming ? "streaming" : "stopped",
    };
  }

  private async runStreamLoop(): Promise<void> {
    return widelog.context(async () => {
      widelog.set("event_name", "log_monitor.stream");
      widelog.set("container_id", this.containerId);
      widelog.set("session_id", this.sessionId);
      widelog.set("runtime_id", this.runtimeId);
      widelog.time.start("duration_ms");

      try {
        for await (const chunk of this.sandbox.provider.streamLogs(this.runtimeId, { tail: 100 })) {
          if (!this.isStreaming) break;

          const lines = this.parseChunk(chunk);
          for (const line of lines) {
            this.processLogLine(line.stream, line.text);
          }
        }

        widelog.set("outcome", "success");
      } catch (error) {
        if (this.isStreaming) {
          this.updateStatus("error");
        }
        widelog.set("outcome", "error");
        widelog.errorFields(error);
      } finally {
        if (this.isStreaming) {
          this.isStreaming = false;
          this.updateStatus("stopped");
        }
        widelog.time.stop("duration_ms");
        widelog.flush();
      }
    });
  }

  private parseChunk(chunk: LogChunk): { stream: "stdout" | "stderr"; text: string }[] {
    const text = new TextDecoder().decode(chunk.data);
    const lines = text.split("\n").filter((line) => line.length > 0);

    return lines.map((line) => ({
      stream: chunk.stream,
      text: line,
    }));
  }

  private processLogLine(stream: "stdout" | "stderr", text: string): void {
    const entry: LogEntry = {
      containerId: this.containerId,
      stream,
      text,
      timestamp: Date.now(),
    };

    this.buffer.push(entry);

    if (this.rateLimiter.canProceed()) {
      this.getPublisher().publishEvent("sessionLogs", { uuid: this.sessionId }, entry);
    }
  }

  private updateStatus(status: "streaming" | "stopped" | "error"): void {
    this.getPublisher().publishDelta(
      "sessionLogs",
      { uuid: this.sessionId },
      {
        type: "source_update",
        containerId: this.containerId,
        status,
      },
    );
  }
}

export type ContainerStartedEvent = {
  sessionId: string;
  containerId: string;
  runtimeId: string;
  hostname: string;
};

export type ContainerStoppedEvent = {
  sessionId: string;
  containerId: string;
};

export class LogMonitor {
  private trackers = new Map<string, LogStreamTracker>();
  private sessionTrackers = new Map<string, Set<string>>();

  constructor(
    private readonly sandbox: Sandbox,
    private readonly deferredPublisher: DeferredPublisher,
  ) {}

  async start(): Promise<void> {
    return widelog.context(async () => {
      widelog.set("event_name", "log_monitor.start");
      widelog.time.start("duration_ms");

      try {
        const runningContainers = await findAllRunningSessionContainers();

        for (const container of runningContainers) {
          this.onContainerStarted({
            sessionId: container.sessionId,
            containerId: container.id,
            runtimeId: container.runtimeId,
            hostname: container.hostname,
          });
        }

        widelog.set("running_container_count", runningContainers.length);
        widelog.set("outcome", "success");
      } catch (error) {
        widelog.set("outcome", "error");
        widelog.errorFields(error);
      } finally {
        widelog.time.stop("duration_ms");
        widelog.flush();
      }
    });
  }

  onContainerStarted(event: ContainerStartedEvent): void {
    const { sessionId, containerId, runtimeId, hostname } = event;
    const key = `${sessionId}:${containerId}`;

    if (this.trackers.has(key)) {
      return;
    }

    const tracker = new LogStreamTracker(
      containerId,
      sessionId,
      runtimeId,
      hostname,
      this.sandbox,
      () => this.deferredPublisher.get(),
    );
    this.trackers.set(key, tracker);

    if (!this.sessionTrackers.has(sessionId)) {
      this.sessionTrackers.set(sessionId, new Set());
    }
    this.sessionTrackers.get(sessionId)!.add(key);

    this.deferredPublisher.get().publishDelta(
      "sessionLogs",
      { uuid: sessionId },
      {
        type: "source_add",
        source: tracker.getSource(),
      },
    );

    tracker.start();
  }

  onContainerStopped(event: ContainerStoppedEvent): void {
    const { sessionId, containerId } = event;
    const key = `${sessionId}:${containerId}`;

    const tracker = this.trackers.get(key);
    if (!tracker) {
      return;
    }

    tracker.stop();
    this.trackers.delete(key);

    const sessionKeys = this.sessionTrackers.get(sessionId);
    if (sessionKeys) {
      sessionKeys.delete(key);
      if (sessionKeys.size === 0) {
        this.sessionTrackers.delete(sessionId);
      }
    }

    this.deferredPublisher.get().publishDelta(
      "sessionLogs",
      { uuid: sessionId },
      {
        type: "source_update",
        containerId,
        status: "stopped",
      },
    );
  }

  getSessionSnapshot(sessionId: string): {
    sources: LogSource[];
    recentLogs: Record<string, LogEntry[]>;
  } {
    const trackerKeys = this.sessionTrackers.get(sessionId);
    if (!trackerKeys || trackerKeys.size === 0) {
      return { sources: [], recentLogs: {} };
    }

    const sources: LogSource[] = [];
    const recentLogs: Record<string, LogEntry[]> = {};

    for (const key of trackerKeys) {
      const tracker = this.trackers.get(key);
      if (tracker) {
        sources.push(tracker.getSource());
        recentLogs[tracker.containerId] = tracker.getBufferedLogs();
      }
    }

    return { sources, recentLogs };
  }

  cleanup(sessionId: string): void {
    const trackerKeys = this.sessionTrackers.get(sessionId);
    if (!trackerKeys) return;

    for (const key of trackerKeys) {
      const tracker = this.trackers.get(key);
      if (tracker) {
        tracker.stop();
        this.trackers.delete(key);
      }
    }

    this.sessionTrackers.delete(sessionId);
  }

  stop(): void {
    for (const tracker of this.trackers.values()) {
      tracker.stop();
    }
    this.trackers.clear();
    this.sessionTrackers.clear();
  }
}
