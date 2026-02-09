import type { DaemonEvent, DaemonEventType } from "../types/orchestrator";

export type DaemonEventHandler = (event: DaemonEvent) => void;

const validEventTypes: DaemonEventType[] = [
  "daemon:started",
  "daemon:ready",
  "daemon:stopped",
  "daemon:error",
];

function isDaemonEvent(value: unknown): value is DaemonEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("type" in value && "sessionId" in value && "timestamp" in value)) {
    return false;
  }
  if (typeof value.sessionId !== "string") {
    return false;
  }
  if (typeof value.timestamp !== "number") {
    return false;
  }
  if (!validEventTypes.includes(value.type as DaemonEventType)) {
    return false;
  }
  return true;
}

export interface DaemonEventSubscriber {
  start(): void;
  stop(): void;
  onEvent(handler: DaemonEventHandler): () => void;
}

export interface DaemonEventSubscriberConfig {
  browserDaemonUrl: string;
  reconnectDelayMs?: number;
}

export const createDaemonEventSubscriber = (
  config: DaemonEventSubscriberConfig
): DaemonEventSubscriber => {
  const handlers = new Set<DaemonEventHandler>();
  const reconnectDelayMs = config.reconnectDelayMs ?? 1000;
  const state = {
    abortController: null as AbortController | null,
    shouldReconnect: false,
  };

  const emit = (event: DaemonEvent) => {
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("[DaemonEventSubscriber] Handler error:", error);
      }
    }
  };

  const connect = async () => {
    if (state.abortController) {
      return;
    }

    const url = `${config.browserDaemonUrl}/events`;
    state.abortController = new AbortController();

    try {
      const response = await fetch(url, {
        signal: state.abortController.signal,
      });

      if (!(response.ok && response.body)) {
        throw new Error(`Failed to connect: ${response.status}`);
      }

      console.log("[DaemonEventSubscriber] Connected to", url);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) {
            continue;
          }
          try {
            const parsed: unknown = JSON.parse(line.slice(6));
            if (isDaemonEvent(parsed)) {
              emit(parsed);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      const isAbortError =
        error instanceof Error && error.name === "AbortError";
      if (!isAbortError) {
        console.warn("[DaemonEventSubscriber] Connection error:", error);
      }
    } finally {
      state.abortController = null;
      if (state.shouldReconnect) {
        setTimeout(connect, reconnectDelayMs);
      }
    }
  };

  const disconnect = () => {
    state.abortController?.abort();
    state.abortController = null;
  };

  return {
    start() {
      state.shouldReconnect = true;
      connect();
    },

    stop() {
      state.shouldReconnect = false;
      disconnect();
    },

    onEvent(handler: DaemonEventHandler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
};
