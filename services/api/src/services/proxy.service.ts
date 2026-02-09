import type { RedisClient } from "bun";
import { widelog } from "../logging";
import { formatProxyUrl } from "../shared/naming";
import type { RouteInfo } from "../types/proxy";

interface ClusterRegistration {
  routes: RouteInfo[];
}

export class ProxyManager {
  constructor(
    private readonly proxyBaseDomain: string,
    private readonly redis: RedisClient
  ) {}

  async registerCluster(
    clusterId: string,
    containers: {
      containerId: string;
      hostname: string;
      ports: Record<number, number>;
    }[]
  ): Promise<RouteInfo[]> {
    return widelog.context(async () => {
      widelog.set("event_name", "proxy.cluster.registered");
      widelog.set("cluster_id", clusterId);
      widelog.set("container_count", containers.length);
      widelog.time.start("duration_ms");

      try {
        const routes: RouteInfo[] = [];

        for (const container of containers) {
          for (const portStr of Object.keys(container.ports)) {
            const port = Number.parseInt(portStr, 10);
            routes.push({
              containerPort: port,
              url: formatProxyUrl(clusterId, port, this.proxyBaseDomain),
            });
          }
        }

        const registration: ClusterRegistration = { routes };
        await this.redis.set(
          `proxy:cluster:${clusterId}`,
          JSON.stringify(registration)
        );
        await this.redis.sadd("proxy:clusters", clusterId);

        widelog.set("route_count", routes.length);
        widelog.set("outcome", "success");
        return routes;
      } catch (error) {
        widelog.set("outcome", "error");
        widelog.errorFields(error);
        throw error;
      } finally {
        widelog.time.stop("duration_ms");
        widelog.flush();
      }
    });
  }

  async unregisterCluster(clusterId: string): Promise<void> {
    return widelog.context(async () => {
      widelog.set("event_name", "proxy.cluster.unregistered");
      widelog.set("cluster_id", clusterId);
      widelog.time.start("duration_ms");

      try {
        await this.redis.del(`proxy:cluster:${clusterId}`);
        await this.redis.srem("proxy:clusters", clusterId);
        widelog.set("outcome", "success");
      } catch (error) {
        widelog.set("outcome", "error");
        widelog.errorFields(error);
        throw error;
      } finally {
        widelog.time.stop("duration_ms");
        widelog.flush();
      }
    });
  }

  async getUrls(clusterId: string): Promise<RouteInfo[]> {
    const data = await this.redis.get(`proxy:cluster:${clusterId}`);
    if (!data) {
      return [];
    }
    const registration: ClusterRegistration = JSON.parse(data);
    return registration.routes;
  }
}
