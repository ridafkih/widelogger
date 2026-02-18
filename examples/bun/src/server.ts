import { serve } from "bun";
import { destroy, widelog } from "./logger";
import { checkout } from "./routes/checkout";
import { health } from "./routes/health";

const routes: Record<
  string,
  (request: Request) => Response | Promise<Response>
> = {
  "POST /checkout": checkout,
  "GET /health": health,
};

const server = serve({
  port: 3000,
  fetch: (request) =>
    widelog.context(async () => {
      const url = new URL(request.url);
      const route = routes[`${request.method} ${url.pathname}`];

      widelog.set("method", request.method);
      widelog.set("path", url.pathname);
      widelog.time.start("duration_ms");

      try {
        if (!route) {
          widelog.set("status_code", 404);
          widelog.set("outcome", "not_found");
          return new Response("Not Found", { status: 404 });
        }

        const response = await route(request);
        widelog.set("status_code", response.status);
        widelog.set("outcome", "success");
        return response;
      } catch (error) {
        widelog.set("status_code", 500);
        widelog.set("outcome", "error");
        widelog.errorFields(error);
        return Response.json(
          { error: "internal server error" },
          { status: 500 }
        );
      } finally {
        widelog.time.stop("duration_ms");
        widelog.flush();
      }
    }),
});

console.log(`Listening on http://localhost:${server.port}`);

process.on("SIGINT", async () => {
  server.stop();
  await destroy();
  process.exit(0);
});
