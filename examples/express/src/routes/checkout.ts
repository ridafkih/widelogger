import type { Request, Response } from "express";
import { widelog } from "../logger";

export const checkout = (request: Request, response: Response) => {
  const { userId } = request.body;

  widelog.set("user.id", userId);
  widelog.set("user.plan", "premium");

  widelog.time.start("db_ms");
  // const order = await processOrder(userId);
  const order = { id: "ord_001", totalCents: 14_999, itemCount: 3 };
  widelog.time.stop("db_ms");

  widelog.set("order.id", order.id);
  widelog.set("order.total_cents", order.totalCents);
  widelog.count("order.items", order.itemCount);

  response.json({ orderId: order.id });
};
