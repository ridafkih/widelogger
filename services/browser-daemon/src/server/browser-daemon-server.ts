import { join } from "node:path";
import {
  errorResponse,
  methodNotAllowedResponse,
  notFoundResponse,
  optionsResponse,
  withCors,
} from "@lab/http-utilities";
import { isHttpMethod, isRouteModule } from "@lab/router";
import type { Server as BunServer } from "bun";
import { TIMING } from "../config/constants";
import { AppError } from "../shared/errors";
import type { DaemonManager } from "../types/daemon";
import type { RouteContext, Widelog } from "../types/route";

interface BrowserDaemonServerConfig {
  daemonManager: DaemonManager;
  widelog: Widelog;
}

export class BrowserDaemonServer {
  private server: BunServer<unknown> | null = null;
  private readonly router = new Bun.FileSystemRouter({
    dir: join(import.meta.dirname, "../routes"),
    style: "nextjs",
  });

  constructor(private readonly config: BrowserDaemonServerConfig) {}

  start(port: number): void {
    const { daemonManager, widelog } = this.config;
    const routeContext: RouteContext = { daemonManager, widelog };

    this.server = Bun.serve({
      port,
      idleTimeout: TIMING.IDLE_TIMEOUT_SECONDS,
      fetch: async (request): Promise<Response> => {
        if (request.method === "OPTIONS") {
          return optionsResponse();
        }

        const url = new URL(request.url);
        return this.handleRouteRequest(request, url, routeContext);
      },
    });
  }

  private async handleRouteRequest(
    request: Request,
    url: URL,
    routeContext: RouteContext
  ): Promise<Response> {
    return this.handleRequestWithWideEvent(request, url, async () => {
      const { widelog } = this.config;
      const match = this.router.match(request);

      if (!match) {
        widelog.set("route", "route_not_found");
        return withCors(notFoundResponse());
      }

      widelog.set("route", match.name);
      for (const [param, value] of Object.entries(match.params)) {
        if (typeof value === "string" && value.length > 0) {
          widelog.set(`route_params.${param}`, value);
        }
      }

      const module: unknown = await import(match.filePath);
      if (!isRouteModule(module)) {
        widelog.set("route_module_valid", false);
        return withCors(errorResponse());
      }

      if (!isHttpMethod(request.method)) {
        widelog.set("method_supported", false);
        return withCors(methodNotAllowedResponse());
      }

      const handler = module[request.method];
      if (!handler) {
        widelog.set("method_implemented", false);
        return withCors(methodNotAllowedResponse());
      }

      return withCors(
        await handler({ request, params: match.params, context: routeContext })
      );
    });
  }

  private async handleRequestWithWideEvent(
    request: Request,
    url: URL,
    handler: () => Promise<Response>
  ): Promise<Response> {
    const { widelog } = this.config;
    const requestId = crypto.randomUUID();

    return widelog.context(async () => {
      widelog.set("request_id", requestId);
      widelog.set("method", request.method);
      widelog.set("path", url.pathname);
      widelog.set("has_query", url.search.length > 0);
      widelog.set("protocol", url.protocol.replace(":", ""));
      const userAgent = request.headers.get("user-agent");
      if (userAgent) {
        widelog.set("user_agent", userAgent);
      }
      widelog.time.start("duration_ms");

      try {
        const response = await handler();
        this.setStatusOutcome(response.status);
        response.headers.set("X-Request-Id", requestId);
        return response;
      } catch (error) {
        const status = error instanceof AppError ? error.statusCode : 500;
        const message =
          error instanceof Error && status < 500
            ? error.message
            : "Internal server error";

        this.setStatusOutcome(status);
        widelog.errorFields(error);

        if (error instanceof AppError) {
          widelog.set("error.code", error.code);
        }

        const response = withCors(
          Response.json({ error: message, requestId }, { status })
        );
        response.headers.set("X-Request-Id", requestId);
        return response;
      } finally {
        widelog.time.stop("duration_ms");
        widelog.flush();
      }
    });
  }

  private setStatusOutcome(statusCode: number): void {
    const { widelog } = this.config;
    widelog.set("status_code", statusCode);
    if (statusCode >= 500) {
      widelog.set("outcome", "error");
      return;
    }

    if (statusCode >= 400) {
      widelog.set("outcome", "client_error");
      return;
    }

    widelog.set("outcome", "success");
  }

  shutdown(): void {
    if (this.server) {
      this.server.stop(true);
      this.server = null;
    }
  }
}
