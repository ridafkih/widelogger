import { initializeSessionContainers } from "../docker/containers";
import { cleanupSession } from "../services/session-cleanup";
import {
  cleanupSessionNetwork,
  cleanupOrphanedNetworks,
  type NetworkContainerNames,
} from "../docker/network";
import type { BrowserServiceManager } from "./browser-service.manager";
import type { ProxyManager } from "../services/proxy";
import type { Sandbox } from "../types/dependencies";
import type { DeferredPublisher } from "../shared/deferred-publisher";

export interface SessionLifecycleConfig {
  browserSocketVolume: string;
  containerNames: NetworkContainerNames;
}

export class SessionLifecycleManager {
  constructor(
    private readonly config: SessionLifecycleConfig,
    private readonly sandbox: Sandbox,
    private readonly proxyManager: ProxyManager,
    private readonly browserServiceManager: BrowserServiceManager,
    private readonly deferredPublisher: DeferredPublisher,
  ) {}

  private getDeps() {
    const { containerNames, browserSocketVolume } = this.config;
    return {
      containerNames,
      browserSocketVolume,
      sandbox: this.sandbox,
      publisher: this.deferredPublisher.get(),
      proxyManager: this.proxyManager,
      cleanupSessionNetwork: (sessionId: string) =>
        cleanupSessionNetwork(sessionId, containerNames, this.sandbox),
    };
  }

  async initialize(): Promise<void> {
    await cleanupOrphanedNetworks(this.config.containerNames, this.sandbox);
  }

  async initializeSession(sessionId: string, projectId: string): Promise<void> {
    await initializeSessionContainers(
      sessionId,
      projectId,
      this.browserServiceManager.service,
      this.getDeps(),
    );
  }

  async cleanupSession(sessionId: string): Promise<void> {
    await cleanupSession(sessionId, this.browserServiceManager.service, this.getDeps());
  }
}
