import type { Context } from "hono";
import { widelog } from "widelogger";

export const health = (context: Context) => {
  widelog.set("outcome", "success");
  return context.json({ status: "ok" });
};
