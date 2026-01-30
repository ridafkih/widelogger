import { join } from "node:path";
import { config } from "./config/environment";
import { createDaemonManager, type DaemonManager } from "./utils/daemon-manager";
import { isHttpMethod, isRouteModule, type RouteContext } from "./utils/route-handler";

const router = new Bun.FileSystemRouter({
  dir: join(import.meta.dirname, "routes"),
  style: "nextjs",
});

const daemonManager: DaemonManager = createDaemonManager({
  baseStreamPort: config.baseStreamPort,
  profileDir: config.profileDir,
});

await daemonManager.start("default");

const context: RouteContext = { daemonManager };

Bun.serve({
  port: config.apiPort,
  idleTimeout: 30,
  async fetch(request) {
    const match = router.match(request);

    if (!match) {
      return new Response("Not Found", { status: 404 });
    }

    const module: unknown = await import(match.filePath);

    if (!isRouteModule(module)) {
      return new Response("Internal Server Error", { status: 500 });
    }

    if (!isHttpMethod(request.method)) {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const handler = module[request.method];

    if (!handler) {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      return await handler(request, match.params, context);
    } catch (error) {
      console.error("[Server] Unhandled error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log(`[Server] Browser daemon listening on port ${config.apiPort}`);

function gracefulShutdown() {
  console.log("[Server] Shutting down...");
  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
