import type { FastifyPluginCallback } from "fastify";
import { widelog } from "widelogger";

export const healthRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get("/health", () => {
    widelog.set("outcome", "success");
    return { status: "ok" };
  });

  done();
};
