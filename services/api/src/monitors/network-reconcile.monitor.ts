import type { ContainerEvent } from "@lab/sandbox-sdk";
import { TIMING } from "../config/constants";
import { ensureSharedContainerConnectedToActiveSessions } from "../runtime/network";
import type { Sandbox } from "../types/dependencies";
import { widelog } from "../logging";

function calculateNextRetryDelay(currentDelay: number): number {
  return Math.min(currentDelay * 2, TIMING.CONTAINER_MONITOR_MAX_RETRY_MS);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class NetworkReconcileMonitor {
  private readonly abortController = new AbortController();
  private readonly watchedContainerNames: Set<string>;

  constructor(
    private readonly sandbox: Sandbox,
    containerNames: string[],
  ) {
    this.watchedContainerNames = new Set(containerNames.filter(Boolean));
    if (this.watchedContainerNames.size === 0) {
      throw new Error("NetworkReconcileMonitor requires at least one shared container name");
    }
  }

  async start(): Promise<void> {
    await widelog.context(async () => {
      widelog.set("event_name", "network_reconcile_monitor.start");
      widelog.set("watched_containers", Array.from(this.watchedContainerNames).join(","));
      widelog.time.start("duration_ms");

      try {
        await this.reconcileAllWatchedContainers("startup");
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

  stop(): void {
    this.abortController.abort();
  }

  private async reconcileAllWatchedContainers(
    reason: "startup" | "start" | "restart",
  ): Promise<void> {
    return widelog.context(async () => {
      widelog.set("event_name", "network_reconcile_monitor.reconciliation_cycle.completed");
      widelog.set("reason", reason);
      widelog.time.start("duration_ms");

      let sessionsChecked = 0;
      let containersConnected = 0;

      try {
        for (const containerName of this.watchedContainerNames) {
          try {
            const result = await ensureSharedContainerConnectedToActiveSessions(
              containerName,
              this.sandbox,
            );
            sessionsChecked += result.checked;
            containersConnected += result.connected;
          } catch (error) {
            widelog.count("error_count");
            widelog.set(
              `errors.${containerName}`,
              error instanceof Error ? error.message : String(error),
            );
          }
        }

        widelog.set("outcome", "success");
      } catch (error) {
        widelog.set("outcome", "error");
        widelog.errorFields(error);
      } finally {
        widelog.set("sessions_checked", sessionsChecked);
        widelog.set("containers_connected", containersConnected);
        widelog.time.stop("duration_ms");
        widelog.flush();
      }
    });
  }

  private async runMonitorLoop(): Promise<void> {
    let retryDelay: number = TIMING.CONTAINER_MONITOR_INITIAL_RETRY_MS;

    while (!this.abortController.signal.aborted) {
      try {
        for await (const event of this.sandbox.provider.streamContainerEvents()) {
          if (this.abortController.signal.aborted) {
            break;
          }

          retryDelay = TIMING.CONTAINER_MONITOR_INITIAL_RETRY_MS;
          await this.processEvent(event);
        }
      } catch (error) {
        if (this.abortController.signal.aborted) {
          return;
        }
        widelog.context(() => {
          widelog.set("event_name", "network_reconcile_monitor.event_stream_error");
          widelog.set("watched_containers", Array.from(this.watchedContainerNames).join(","));
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

  private async processEvent(event: ContainerEvent): Promise<void> {
    if (event.action !== "start" && event.action !== "restart") {
      return;
    }

    const containerName = event.attributes["name"];
    if (!containerName || !this.watchedContainerNames.has(containerName)) {
      return;
    }

    await this.reconcileAllWatchedContainers(event.action);
  }
}
