import { widelog } from "../logger";

export const health = () => {
  widelog.set("outcome", "success");
  return Response.json({ status: "ok" });
};
