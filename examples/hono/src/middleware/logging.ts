import type { MiddlewareHandler } from "hono";
import { widelog } from "widelogger";
import { context } from "../logger";

export const logging: MiddlewareHandler = async (honoContext, next) => {
  await context(async () => {
    widelog.set("method", honoContext.req.method);
    widelog.set("path", honoContext.req.path);
    widelog.time.start("duration_ms");

    try {
      await next();
      widelog.set("status_code", honoContext.res.status);
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
