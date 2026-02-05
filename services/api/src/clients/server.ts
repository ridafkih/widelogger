import { createPublisher, type WebSocketData } from "@lab/multiplayer-server";
import { schema } from "@lab/multiplayer-sdk";
import type { Server as BunServer } from "bun";
import type { ImageStore } from "@lab/context";
import { SERVER } from "../config/constants";
import { createWebSocketHandlers, type Auth } from "../websocket/websocket-handler";
import { createOpenCodeProxyHandler } from "../opencode/handler";
import { createChannelRestHandler } from "../snapshots/rest-handler";
import type { PoolManager } from "../services/pool-manager";
import type { LogMonitor } from "../monitors/log.monitor";
import { reconcileNetworkConnections, type NetworkContainerNames } from "../docker/network";
import { isHttpMethod, isRouteModule } from "@lab/router";
import type { RouteContext } from "../types/route";
import { join } from "node:path";
import type { PromptService } from "../types/prompt";
import type { Sandbox, OpencodeClient, Publisher, Widelog } from "../types/dependencies";
import { AppError } from "../shared/errors";
import type { BrowserServiceManager } from "../managers/browser-service.manager";
import type { SessionLifecycleManager } from "../managers/session-lifecycle.manager";
import {
  withCors,
  optionsResponse,
  notFoundResponse,
  errorResponse,
  methodNotAllowedResponse,
} from "@lab/http-utilities";

export interface ApiServerConfig {
  containerNames: NetworkContainerNames;
  proxyBaseDomain: string;
  opencodeUrl: string;
  github: {
    clientId?: string;
    clientSecret?: string;
    callbackUrl?: string;
  };
  frontendUrl?: string;
}

export interface ApiServerServices {
  browserService: BrowserServiceManager;
  sessionLifecycle: SessionLifecycleManager;
  poolManager: PoolManager;
  logMonitor: LogMonitor;
  sandbox: Sandbox;
  opencode: OpencodeClient;
  promptService: PromptService;
  imageStore?: ImageStore;
  widelog: Widelog;
}

export class ApiServer {
  private server: BunServer<unknown> | null = null;
  private publisher: Publisher | null = null;
  private readonly router = new Bun.FileSystemRouter({
    dir: join(import.meta.dirname, "../routes"),
    style: "nextjs",
  });

  constructor(
    private readonly config: ApiServerConfig,
    private readonly services: ApiServerServices,
  ) {}

  private getServer(): BunServer<unknown> {
    if (!this.server) throw new Error("Server not started");
    return this.server;
  }

  private getPublisher(): Publisher {
    if (!this.publisher) throw new Error("Server not started");
    return this.publisher;
  }

  async start(port: string): Promise<Publisher> {
    const { containerNames, proxyBaseDomain, opencodeUrl, github, frontendUrl } = this.config;
    const {
      browserService,
      sessionLifecycle,
      poolManager,
      logMonitor,
      sandbox,
      opencode,
      promptService,
      imageStore,
    } = this.services;

    // Create publisher with lazy server access - publisher can be used in handlers
    // but will only access the server when actually publishing (after server starts)
    this.publisher = createPublisher(schema, () => this.getServer());

    const handleOpenCodeProxy = createOpenCodeProxyHandler({
      opencodeUrl,
      publisher: this.publisher,
      promptService,
    });

    const routeContext: RouteContext = {
      browserService,
      sessionLifecycle,
      poolManager,
      promptService,
      sandbox,
      opencode,
      publisher: this.publisher,
      logMonitor,
      imageStore,
      proxyBaseDomain,
      githubClientId: github.clientId,
      githubClientSecret: github.clientSecret,
      githubCallbackUrl: github.callbackUrl,
      frontendUrl,
    };

    const { websocketHandler, upgrade } = createWebSocketHandlers({
      browserService: browserService.service,
      publisher: this.publisher,
      opencode,
      logMonitor,
      proxyBaseDomain,
    });

    const handleChannelRequest = createChannelRestHandler({
      browserService: browserService.service,
      opencode,
      logMonitor,
      proxyBaseDomain,
    });

    this.server = Bun.serve<WebSocketData<Auth>>({
      port,
      idleTimeout: SERVER.IDLE_TIMEOUT_SECONDS,
      websocket: websocketHandler,
      fetch: async (request): Promise<Response | undefined> => {
        if (request.method === "OPTIONS") {
          return optionsResponse();
        }

        const url = new URL(request.url);

        if (url.pathname === "/ws") {
          return upgrade(request, this.getServer());
        }

        if (url.pathname.startsWith("/opencode/")) {
          return handleOpenCodeProxy(request, url);
        }

        const [, channel] = url.pathname.match(/^\/channels\/([^/]+)\/snapshot$/) ?? [];
        if (channel) {
          return withCors(await handleChannelRequest(channel, url.searchParams));
        }

        return this.handleRouteRequest(request, url, routeContext);
      },
    });

    reconcileNetworkConnections(containerNames, sandbox).catch((error) =>
      console.warn("[ApiServer] Network reconciliation failed:", error),
    );

    return this.publisher;
  }

  private async handleRouteRequest(
    request: Request,
    url: URL,
    routeContext: RouteContext,
  ): Promise<Response> {
    const { widelog } = this.services;
    const requestId = crypto.randomUUID();

    return widelog.context(async () => {
      widelog.set("requestId", requestId);
      widelog.set("method", request.method);
      widelog.set("path", url.pathname);
      widelog.time.start("duration");

      let match: ReturnType<typeof this.router.match> = null;

      try {
        match = this.router.match(request);

        if (!match) {
          widelog.set("status", 404);
          const response = withCors(notFoundResponse());
          response.headers.set("X-Request-Id", requestId);
          return response;
        }

        widelog.set("route", match.name);

        const module: unknown = await import(match.filePath);

        if (!isRouteModule(module)) {
          widelog.set("status", 500);
          const response = withCors(errorResponse());
          response.headers.set("X-Request-Id", requestId);
          return response;
        }

        if (!isHttpMethod(request.method)) {
          widelog.set("status", 405);
          const response = withCors(methodNotAllowedResponse());
          response.headers.set("X-Request-Id", requestId);
          return response;
        }

        const handler = module[request.method];

        if (!handler) {
          widelog.set("status", 405);
          const response = withCors(methodNotAllowedResponse());
          response.headers.set("X-Request-Id", requestId);
          return response;
        }

        const response = await handler(request, match.params, routeContext);
        widelog.set("status", response.status);
        const corsResponse = withCors(response);
        corsResponse.headers.set("X-Request-Id", requestId);
        return corsResponse;
      } catch (error) {
        const status = error instanceof AppError ? error.statusCode : 500;
        const message =
          error instanceof Error && status < 500 ? error.message : "Internal server error";

        widelog.set("status", status);
        widelog.set("error", error instanceof Error ? error.message : "Unknown error");
        if (error instanceof AppError) {
          widelog.set("errorCode", error.code);
        }

        if (status >= 500) console.error(`[${match?.name ?? "unknown"}]`, error);

        const response = withCors(Response.json({ error: message, requestId }, { status }));
        response.headers.set("X-Request-Id", requestId);
        return response;
      } finally {
        widelog.time.stop("duration");
        widelog.flush();
      }
    });
  }

  shutdown(): void {
    this.services.browserService.shutdown();
  }
}
