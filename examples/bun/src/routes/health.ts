import { widelog } from "widelogger";

export const health = () => {
  widelog.set("outcome", "success");
  return Response.json({ status: "ok" });
};
