import type { FastifyPluginCallback } from "fastify";
import { widelog } from "../logger";

interface CheckoutBody {
  userId: string;
}

export const checkoutRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.post<{ Body: CheckoutBody }>("/checkout", (request) => {
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

    return { orderId: order.id };
  });

  done();
};
