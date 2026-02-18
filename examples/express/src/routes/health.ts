import type { Request, Response } from "express";
import { widelog } from "../logger";

export const health = (_request: Request, response: Response) => {
  widelog.set("outcome", "success");
  response.json({ status: "ok" });
};
