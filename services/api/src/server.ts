import { type WebSocketData } from "@lab/multiplayer-server";
import { type BrowserSessionState } from "@lab/browser-orchestration";
import { createWebSocketHandlers, type Auth } from "./handlers/websocket";
import { handleOpenCodeProxy } from "./handlers/opencode";
import { bootstrapBrowserService, shutdownBrowserService } from "./browser/bootstrap";
import { type BrowserService } from "./browser/browser-service";
import { createSessionInitializer } from "./session-initializer";
import { isHttpMethod, isRouteModule, type RouteContext } from "./utils/route-handler";
import { publisher } from "./publisher";
import { join } from "node:path";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Lab-Session-Id",
};

const HTTP_NOT_FOUND = 404;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_INTERNAL_SERVER_ERROR = 500;

function withCors(response: Response): Response {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

const router = new Bun.FileSystemRouter({
  dir: join(import.meta.dirname, "routes"),
  style: "nextjs",
});

const port = process.env.API_PORT;
if (port === undefined) {
  throw Error("API_PORT must be defined");
}

const browserApiUrl = process.env.BROWSER_API_URL;
if (!browserApiUrl) {
  throw new Error("BROWSER_API_URL must be defined");
}

const browserConfig = {
  browserApiUrl,
  browserWsHost: process.env.BROWSER_WS_HOST ?? "browser",
  cleanupDelayMs: parseInt(process.env.BROWSER_CLEANUP_DELAY_MS ?? "10000", 10),
  reconcileIntervalMs: parseInt(process.env.RECONCILE_INTERVAL_MS ?? "5000", 10),
  maxRetries: parseInt(process.env.MAX_DAEMON_RETRIES ?? "3", 10),
  publishFrame: (sessionId: string, frame: string, timestamp: number) => {
    publisher.publishEvent(
      "sessionBrowserFrames",
      { uuid: sessionId },
      {
        type: "frame" as const,
        data: frame,
        timestamp,
      },
    );
  },
  publishStateChange: (sessionId: string, state: BrowserSessionState) => {
    publisher.publishSnapshot(
      "sessionBrowserState",
      { uuid: sessionId },
      {
        desiredState: state.desiredState,
        currentState: state.currentState,
        streamPort: state.streamPort ?? undefined,
        errorMessage: state.errorMessage ?? undefined,
      },
    );
  },
};

let browserService: BrowserService;
let routeContext: RouteContext;

const bootstrap = async () => {
  browserService = await bootstrapBrowserService(browserConfig);

  const initializeSessionContainers = createSessionInitializer(browserService);

  routeContext = {
    browserService,
    initializeSessionContainers,
  };

  const { websocketHandler, upgrade } = createWebSocketHandlers(browserService);

  const server = Bun.serve<WebSocketData<Auth>>({
    port,
    idleTimeout: 0,
    websocket: websocketHandler,
    async fetch(request): Promise<Response | undefined> {
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      if (url.pathname === "/ws") {
        return upgrade(request, server);
      }

      if (url.pathname.startsWith("/opencode/")) {
        return handleOpenCodeProxy(request, url);
      }

      const match = router.match(request);

      if (!match) {
        return withCors(new Response("Not found", { status: HTTP_NOT_FOUND }));
      }

      const module: unknown = await import(match.filePath);

      if (!isRouteModule(module)) {
        return withCors(
          new Response("Internal server error", { status: HTTP_INTERNAL_SERVER_ERROR }),
        );
      }

      if (!isHttpMethod(request.method)) {
        return withCors(new Response("Method not allowed", { status: HTTP_METHOD_NOT_ALLOWED }));
      }

      const handler = module[request.method];

      if (!handler) {
        return withCors(new Response("Method not allowed", { status: HTTP_METHOD_NOT_ALLOWED }));
      }

      const response = await handler(request, match.params, routeContext);
      return withCors(response);
    },
  });

  browserService.startReconciler();

  return server;
};

export const server = await bootstrap();

async function gracefulShutdown() {
  shutdownBrowserService(browserService);
  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
