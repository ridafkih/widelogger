import fastify from "fastify";
import { destroy } from "./logger";
import { logging } from "./plugins/logging";
import { checkoutRoutes } from "./routes/checkout";
import { healthRoutes } from "./routes/health";

const app = fastify();

app.register(logging);
app.register(healthRoutes);
app.register(checkoutRoutes);

app.listen({ port: 3000 }, () => {
  console.log("Listening on http://localhost:3000");
});

process.on("SIGINT", async () => {
  await app.close();
  await destroy();
  process.exit(0);
});
