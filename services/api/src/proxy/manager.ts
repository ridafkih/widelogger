import type { DockerClient } from "@lab/sandbox-docker";
import { CaddyClient } from "./caddy";
import type { CaddyConfig, ClusterContainer, ProxyManager, RouteInfo } from "./types";

function isAlreadyConnectedError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    err.statusCode === 403 &&
    "json" in err &&
    typeof err.json === "object" &&
    err.json !== null &&
    "message" in err.json &&
    typeof err.json.message === "string" &&
    err.json.message.includes("already exists in network")
  );
}

interface CaddyProxyManagerOptions {
  docker: DockerClient;
  adminUrl: string;
  baseDomain: string;
  caddyContainerName: string;
}

interface ClusterRegistration {
  networkName: string;
  routes: RouteInfo[];
}

export class CaddyProxyManager implements ProxyManager {
  private readonly docker: DockerClient;
  private readonly caddy: CaddyClient;
  private readonly baseDomain: string;
  private readonly caddyContainerName: string;
  private readonly clusters = new Map<string, ClusterRegistration>();
  private caddyContainerId: string | null = null;

  constructor(options: CaddyProxyManagerOptions) {
    this.docker = options.docker;
    this.baseDomain = options.baseDomain;
    this.caddyContainerName = options.caddyContainerName;
    this.caddy = new CaddyClient(options.adminUrl);
  }

  private get matchDomain(): string {
    return this.baseDomain.split(":")[0];
  }

  async initialize(): Promise<void> {
    const exists = await this.docker.containerExists(this.caddyContainerName);
    if (!exists) {
      throw new Error(`Caddy container "${this.caddyContainerName}" does not exist`);
    }

    const info = await this.docker.inspectContainer(this.caddyContainerName);
    if (info.state !== "running") {
      throw new Error(
        `Caddy container "${this.caddyContainerName}" is not running (state: ${info.state})`,
      );
    }

    this.caddyContainerId = info.id;

    await this.waitForCaddy();
    await this.caddy.loadConfig(this.createBaseConfig());
  }

  async registerCluster(
    clusterId: string,
    networkName: string,
    containers: ClusterContainer[],
  ): Promise<RouteInfo[]> {
    if (!this.caddyContainerId) {
      throw new Error("ProxyManager not initialized. Call initialize() first.");
    }

    try {
      await this.docker.connectToNetwork(this.caddyContainerId, networkName);
    } catch (err) {
      if (!isAlreadyConnectedError(err)) {
        throw err;
      }
    }

    const registeredRoutes: RouteInfo[] = [];

    for (const container of containers) {
      for (const containerPortStr of Object.keys(container.ports)) {
        const containerPort = parseInt(containerPortStr, 10);
        const subdomain = `${clusterId}--${containerPort}`;
        const routeId = `${clusterId}-${containerPort}`;

        await this.caddy.addRoute({
          "@id": routeId,
          match: [{ host: [`${subdomain}.${this.matchDomain}`] }],
          handle: [
            {
              handler: "reverse_proxy",
              upstreams: [{ dial: `${container.hostname}:${containerPort}` }],
            },
          ],
        });

        registeredRoutes.push({
          containerPort,
          url: `http://${subdomain}.${this.baseDomain}`,
        });
      }
    }

    this.clusters.set(clusterId, { networkName, routes: registeredRoutes });
    return registeredRoutes;
  }

  async unregisterCluster(clusterId: string): Promise<void> {
    const registration = this.clusters.get(clusterId);
    if (!registration) {
      throw new Error(`Cluster ${clusterId} is not registered`);
    }

    for (const route of registration.routes) {
      const routeId = `${clusterId}-${route.containerPort}`;
      await this.caddy.deleteRoute(routeId);
    }

    if (!this.caddyContainerId) {
      throw new Error("ProxyManager not initialized. Call initialize() first.");
    }

    await this.docker.disconnectFromNetwork(this.caddyContainerId, registration.networkName);

    this.clusters.delete(clusterId);
  }

  getUrls(clusterId: string): RouteInfo[] {
    const registration = this.clusters.get(clusterId);
    if (!registration) {
      throw new Error(`Cluster ${clusterId} is not registered`);
    }
    return registration.routes;
  }

  private createBaseConfig(): CaddyConfig {
    return {
      admin: { listen: "0.0.0.0:2019" },
      apps: {
        http: {
          servers: {
            srv0: {
              listen: [":80"],
              routes: [],
            },
          },
        },
      },
    };
  }

  private async waitForCaddy(maxAttempts = 30, intervalMs = 1000): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (await this.caddy.isHealthy()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Caddy failed to become healthy after ${maxAttempts} attempts`);
  }
}
