import type { FastifyInstance } from "fastify";
import { widelog } from "../logger";

export const logging = (app: FastifyInstance) => {
  app.addHook("onRequest", (request, _reply, done) => {
    widelog.context(() => {
      widelog.set("method", request.method);
      widelog.set("path", request.url);
      widelog.time.start("duration_ms");
      done();
    });
  });

  app.addHook("onResponse", (_request, reply, done) => {
    widelog.set("status_code", reply.statusCode);
    widelog.time.stop("duration_ms");
    widelog.flush();
    done();
  });
};
