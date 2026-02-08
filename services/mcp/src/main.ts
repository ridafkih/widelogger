import { widelog } from "./logging";
import type { setup } from "./setup";
import type { env } from "./env";

type MainOptions = {
  env: (typeof env)["inferOut"];
  extras: Awaited<ReturnType<typeof setup>>;
};

type MainFunction = (options: MainOptions) => unknown;

export const main = (async ({ env, extras }) => {
  return widelog.context(async () => {
    widelog.set("event_name", "mcp.startup");
    widelog.set("port", env.MCP_PORT);

    const { server, transport } = extras;

    await server.connect(transport);

    const httpServer = Bun.serve({
      port: env.MCP_PORT,
      fetch: (request) => transport.handleRequest(request),
    });

    widelog.flush();

    return () => {
      widelog.context(() => {
        widelog.set("event_name", "mcp.shutdown");
        httpServer.stop(true);
        widelog.flush();
      });
    };
  });
}) satisfies MainFunction;
