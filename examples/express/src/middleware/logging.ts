import type { NextFunction, Request, Response } from "express";
import { widelog } from "../logger";

export const logging = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  widelog.context(() => {
    widelog.set("method", request.method);
    widelog.set("path", request.path);
    widelog.time.start("duration_ms");

    response.on("finish", () => {
      widelog.set("status_code", response.statusCode);
      widelog.time.stop("duration_ms");
      widelog.flush();
    });

    next();
  });
};
