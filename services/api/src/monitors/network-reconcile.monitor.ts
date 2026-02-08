import type { ContainerEvent } from "@lab/sandbox-sdk";
import { TIMING } from "../config/constants";
import { ensureSharedContainerConnectedToActiveSessions } from "../runtime/network";
import type { Sandbox } from "../types/dependencies";
import { logger } from "../logging";

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
    logger.info({
      event_name: "network_reconcile_monitor.start",
      watched_containers: Array.from(this.watchedContainerNames),
    });

    await this.ensureAllWatchedContainersConnected();
    this.runMonitorLoop();
  }

  stop(): void {
    this.abortController.abort();
  }

  private async ensureAllWatchedContainersConnected(): Promise<void> {
    for (const containerName of this.watchedContainerNames) {
      await this.ensureContainerConnectedToActiveSessions(containerName, "startup");
    }
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
        logger.error({
          event_name: "network_reconcile_monitor.event_stream_error",
          retry_delay_ms: retryDelay,
          error,
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

    await this.ensureContainerConnectedToActiveSessions(containerName, event.action);
  }

  private async ensureContainerConnectedToActiveSessions(
    containerName: string,
    reason: "startup" | "start" | "restart",
  ): Promise<void> {
    try {
      const result = await ensureSharedContainerConnectedToActiveSessions(
        containerName,
        this.sandbox,
      );
      logger.info({
        event_name: "network_reconcile_monitor.container_connectivity_checked",
        container_name: containerName,
        reason,
        checked_count: result.checked,
        connected_count: result.connected,
        missing_networks: result.missingNetworks,
      });
    } catch (error) {
      logger.error({
        event_name: "network_reconcile_monitor.ensure_connectivity_failed",
        container_name: containerName,
        reason,
        error,
      });
    }
  }
}
