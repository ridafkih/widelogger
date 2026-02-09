import type { ContainerEvent } from "@lab/sandbox-sdk";
import { LABELS, TIMING } from "../config/constants";
import { widelog } from "../logging";
import {
  findAllActiveSessionContainers,
  findSessionContainerByRuntimeId,
  findSessionContainerDetailsByRuntimeId,
  updateSessionContainerStatus,
} from "../repositories/container-session.repository";
import type { DeferredPublisher } from "../shared/deferred-publisher";
import { CONTAINER_STATUS, type ContainerStatus } from "../types/container";
import type { Sandbox } from "../types/dependencies";
import type { LogMonitor } from "./log.monitor";

function mapEventToStatus(event: ContainerEvent): ContainerStatus | null {
  switch (event.action) {
    case "start":
      return CONTAINER_STATUS.RUNNING;
    case "stop":
    case "die":
    case "kill":
      return CONTAINER_STATUS.STOPPED;
    case "oom":
      return CONTAINER_STATUS.ERROR;
    case "health_status":
      if (event.attributes.health_status === "unhealthy") {
        return CONTAINER_STATUS.ERROR;
      }
      return null;
    default:
      return null;
  }
}

function calculateNextRetryDelay(currentDelay: number): number {
  return Math.min(currentDelay * 2, TIMING.CONTAINER_MONITOR_MAX_RETRY_MS);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class ContainerMonitor {
  private readonly abortController = new AbortController();
  private logMonitor: LogMonitor | null = null;

  constructor(
    private readonly sandbox: Sandbox,
    private readonly deferredPublisher: DeferredPublisher
  ) {}

  async start(logMonitor: LogMonitor): Promise<void> {
    this.logMonitor = logMonitor;
    await widelog.context(async () => {
      widelog.set("event_name", "container_monitor.start");
      widelog.time.start("duration_ms");

      try {
        await this.syncContainerStatuses();
        widelog.set("outcome", "success");
      } catch (error) {
        widelog.set("outcome", "error");
        widelog.errorFields(error);
      } finally {
        widelog.time.stop("duration_ms");
        widelog.flush();
      }
    });
    this.runMonitorLoop();
  }

  private async syncContainerStatuses(): Promise<void> {
    const activeContainers = await findAllActiveSessionContainers();

    for (const container of activeContainers) {
      const isRunning = await this.sandbox.provider.containerExists(
        container.runtimeId
      );
      const actualStatus: ContainerStatus = isRunning
        ? CONTAINER_STATUS.RUNNING
        : CONTAINER_STATUS.STOPPED;

      if (actualStatus !== container.status) {
        await updateSessionContainerStatus(container.id, actualStatus);
        this.deferredPublisher.get().publishDelta(
          "sessionContainers",
          { uuid: container.sessionId },
          {
            type: "update",
            container: { id: container.id, status: actualStatus },
          }
        );
      }
    }
  }

  stop(): void {
    this.abortController.abort();
  }

  private async runMonitorLoop(): Promise<void> {
    let retryDelay: number = TIMING.CONTAINER_MONITOR_INITIAL_RETRY_MS;

    while (!this.abortController.signal.aborted) {
      try {
        for await (const event of this.sandbox.provider.streamContainerEvents({
          filters: { label: [LABELS.SESSION] },
        })) {
          if (this.abortController.signal.aborted) {
            break;
          }

          retryDelay = TIMING.CONTAINER_MONITOR_INITIAL_RETRY_MS;
          await this.processContainerEvent(event);
        }
      } catch (error) {
        if (this.abortController.signal.aborted) {
          return;
        }

        widelog.context(() => {
          widelog.set("event_name", "container_monitor.event_stream_error");
          widelog.set("retry_delay_ms", retryDelay);
          widelog.set("outcome", "error");
          widelog.errorFields(error);
          widelog.flush();
        });

        await sleep(retryDelay);
        retryDelay = calculateNextRetryDelay(retryDelay);
      }
    }
  }

  private async processContainerEvent(event: ContainerEvent): Promise<void> {
    const status = mapEventToStatus(event);
    if (!status) {
      return;
    }

    const sessionId = event.attributes[LABELS.SESSION];
    if (!sessionId) {
      return;
    }

    const sessionContainer = await findSessionContainerByRuntimeId(
      event.containerId
    );
    if (!sessionContainer) {
      return;
    }

    await updateSessionContainerStatus(sessionContainer.id, status);

    this.deferredPublisher.get().publishDelta(
      "sessionContainers",
      { uuid: sessionId },
      {
        type: "update",
        container: { id: sessionContainer.id, status },
      }
    );

    await this.notifyLogMonitor(event, status);
  }

  private async notifyLogMonitor(
    event: ContainerEvent,
    status: ContainerStatus
  ): Promise<void> {
    if (!this.logMonitor) {
      return;
    }

    if (status === CONTAINER_STATUS.RUNNING) {
      const details = await findSessionContainerDetailsByRuntimeId(
        event.containerId
      );
      if (details) {
        this.logMonitor.onContainerStarted({
          sessionId: details.sessionId,
          containerId: details.id,
          runtimeId: event.containerId,
          hostname: details.hostname,
        });
      }
    } else if (
      status === CONTAINER_STATUS.STOPPED ||
      status === CONTAINER_STATUS.ERROR
    ) {
      const details = await findSessionContainerDetailsByRuntimeId(
        event.containerId
      );
      if (details) {
        this.logMonitor.onContainerStopped({
          sessionId: details.sessionId,
          containerId: details.id,
        });
      }
    }
  }
}
