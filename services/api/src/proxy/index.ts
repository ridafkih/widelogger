import { DockerClient } from "@lab/sandbox-docker";
import { CaddyProxyManager } from "./manager";

const { CADDY_ADMIN_URL, PROXY_BASE_DOMAIN, CADDY_CONTAINER_NAME } = process.env;

if (!CADDY_ADMIN_URL) throw new Error("CADDY_ADMIN_URL must be defined");
if (!PROXY_BASE_DOMAIN) throw new Error("PROXY_BASE_DOMAIN must be defined");
if (!CADDY_CONTAINER_NAME) throw new Error("CADDY_CONTAINER_NAME must be defined");

export const proxyManager = new CaddyProxyManager({
  docker: new DockerClient(),
  adminUrl: CADDY_ADMIN_URL,
  baseDomain: PROXY_BASE_DOMAIN,
  caddyContainerName: CADDY_CONTAINER_NAME,
});

let initialized = false;

export async function ensureProxyInitialized(): Promise<void> {
  if (initialized) return;
  await proxyManager.initialize();
  initialized = true;
}

export function isProxyInitialized(): boolean {
  return initialized;
}
