import type { Context } from "hono";
import { widelog } from "../logger";

export const health = (context: Context) => {
  widelog.set("outcome", "success");
  return context.json({ status: "ok" });
};
