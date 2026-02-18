import type { MiddlewareHandler } from "hono";
import { widelog } from "../logger";

export const logging: MiddlewareHandler = async (context, next) => {
  await widelog.context(async () => {
    widelog.set("method", context.req.method);
    widelog.set("path", context.req.path);
    widelog.time.start("duration_ms");

    try {
      await next();
      widelog.set("status_code", context.res.status);
      widelog.set("outcome", "success");
    } catch (error) {
      widelog.set("status_code", 500);
      widelog.set("outcome", "error");
      widelog.errorFields(error);
      throw error;
    } finally {
      widelog.time.stop("duration_ms");
      widelog.flush();
    }
  });
};
