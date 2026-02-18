import type { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import { widelog } from "../logger";

const loggingPlugin: FastifyPluginCallback = (app, _options, pluginDone) => {
  app.addHook("onRequest", (request, reply, done) => {
    widelog.context(
      () =>
        new Promise<void>((resolve) => {
          widelog.set("method", request.method);
          widelog.set("path", request.url);
          widelog.time.start("duration_ms");

          reply.raw.on("finish", () => {
            widelog.set("status_code", reply.statusCode);
            widelog.time.stop("duration_ms");
            widelog.flush();
            resolve();
          });

          done();
        })
    );
  });

  pluginDone();
};

export const logging = fp(loggingPlugin);
