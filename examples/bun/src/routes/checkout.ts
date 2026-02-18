import { widelog } from "../logger";

interface CheckoutBody {
  userId: string;
}

export const checkout = async (request: Request) => {
  const body = await request.json<CheckoutBody>();

  // These fields are added to the same wide event that the
  // server middleware started — no need to pass context around.
  widelog.set("user.id", body.userId);
  widelog.set("user.plan", "premium");

  widelog.time.start("db_ms");
  // const order = await processOrder(body.userId);
  const order = { id: "ord_001", totalCents: 14_999, itemCount: 3 };
  widelog.time.stop("db_ms");

  widelog.set("order.id", order.id);
  widelog.set("order.total_cents", order.totalCents);
  widelog.count("order.items", order.itemCount);

  return Response.json({ orderId: order.id });
};
