import type { DockerClient } from "@lab/sandbox-docker";
import { CaddyClient } from "./caddy";
import type {
  CaddyConfig,
  ClusterContainer,
  ProxyManager,
  ReverseProxyHandler,
  RouteInfo,
} from "../../types/proxy";

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

function createReverseProxyHandler(upstream: string): ReverseProxyHandler {
  return {
    handler: "reverse_proxy",
    upstreams: [{ dial: upstream }],
    transport: {
      protocol: "http",
      dial_timeout: "5s",
      response_header_timeout: "10s",
    },
    health_checks: {
      passive: {
        fail_duration: "5s",
        max_fails: 1,
        unhealthy_status: [502, 503, 504],
      },
    },
  };
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
    const domain = this.baseDomain.split(":")[0];
    if (!domain) throw new Error("Invalid base domain");
    return domain;
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

    const networkAliases = ["internal"];
    const registeredRoutes: RouteInfo[] = [];
    const routeConfigs: {
      routeId: string;
      subdomain: string;
      upstream: string;
      containerPort: number;
    }[] = [];

    for (const container of containers) {
      for (const containerPortStr of Object.keys(container.ports)) {
        const containerPort = parseInt(containerPortStr, 10);
        const subdomain = `${clusterId}--${containerPort}`;
        const routeId = `${clusterId}-${containerPort}`;
        const upstream = `${container.hostname}:${containerPort}`;

        networkAliases.push(`${subdomain}.internal`);
        routeConfigs.push({ routeId, subdomain, upstream, containerPort });
      }
    }

    try {
      await this.docker.connectToNetwork(this.caddyContainerId, networkName, {
        aliases: networkAliases,
      });
    } catch (error) {
      if (isAlreadyConnectedError(error)) {
        await this.docker.disconnectFromNetwork(this.caddyContainerId, networkName);
        await this.docker.connectToNetwork(this.caddyContainerId, networkName, {
          aliases: networkAliases,
        });
      } else {
        throw error;
      }
    }

    const routePromises: Promise<void>[] = [];

    for (const { routeId, subdomain, upstream, containerPort } of routeConfigs) {
      routePromises.push(
        this.caddy.addRoute({
          "@id": routeId,
          match: [
            {
              host: [
                `${subdomain}.${this.matchDomain}`,
                `${subdomain}.${this.baseDomain}`,
                `${subdomain}.internal`,
              ],
            },
          ],
          handle: [createReverseProxyHandler(upstream)],
        }),
      );

      routePromises.push(
        this.caddy.addRoute({
          "@id": `${routeId}-path`,
          match: [{ path: [`/${subdomain}`, `/${subdomain}/*`] }],
          handle: [
            { handler: "rewrite", strip_path_prefix: `/${subdomain}` },
            createReverseProxyHandler(upstream),
          ],
        }),
      );

      registeredRoutes.push({
        containerPort,
        url: `http://${subdomain}.${this.baseDomain}`,
      });
    }

    await Promise.all(routePromises);

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
      await this.caddy.deleteRoute(`${routeId}-path`);
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

  async getConfig(): Promise<unknown> {
    return this.caddy.getConfig();
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

  private async waitForCaddy(timeoutMs = 30000): Promise<void> {
    if (await this.caddy.isHealthy()) {
      return;
    }

    const startTime = Date.now();
    const containerId = this.caddyContainerId;
    if (!containerId) {
      throw new Error("Caddy container ID not set");
    }

    for await (const event of this.docker.streamContainerEvents({
      filters: { container: [containerId] },
    })) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error("Caddy failed to become healthy: timeout");
      }

      if (event.action === "health_status: healthy") {
        return;
      }
    }

    throw new Error("Caddy container event stream ended unexpectedly");
  }
}
