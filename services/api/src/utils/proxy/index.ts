import type { RouteInfo } from "../../types/proxy";
import { config } from "../../config/environment";

const { PROXY_BASE_DOMAIN } = process.env;

if (!PROXY_BASE_DOMAIN) throw new Error("PROXY_BASE_DOMAIN must be defined");

interface ClusterRegistration {
  networkName: string;
  routes: RouteInfo[];
}

const clusters = new Map<string, ClusterRegistration>();

export const proxyManager = {
  async registerCluster(
    clusterId: string,
    networkName: string,
    containers: { containerId: string; hostname: string; ports: Record<number, number> }[],
  ): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];

    for (const container of containers) {
      for (const portStr of Object.keys(container.ports)) {
        const port = parseInt(portStr, 10);
        const subdomain = `${clusterId}--${port}`;
        routes.push({
          containerPort: port,
          url: `http://${subdomain}.${config.proxyBaseDomain}`,
        });
      }
    }

    clusters.set(clusterId, { networkName, routes });
    console.log(`[Proxy] Registered cluster ${clusterId} with ${routes.length} routes`);
    return routes;
  },

  async unregisterCluster(clusterId: string): Promise<void> {
    clusters.delete(clusterId);
    console.log(`[Proxy] Unregistered cluster ${clusterId}`);
  },

  getUrls(clusterId: string): RouteInfo[] {
    const registration = clusters.get(clusterId);
    if (!registration) {
      return [];
    }
    return registration.routes;
  },
};

let initialized = false;

export async function ensureProxyInitialized(): Promise<void> {
  if (initialized) return;
  initialized = true;
  console.log("[Proxy] Initialized (Bun proxy service handles routing)");
}

export function isProxyInitialized(): boolean {
  return initialized;
}
