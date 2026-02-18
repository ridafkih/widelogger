import { serve } from "bun";
import { Hono } from "hono";
import { destroy } from "./logger";
import { logging } from "./middleware/logging";
import { checkout } from "./routes/checkout";
import { health } from "./routes/health";

const app = new Hono();

app.use(logging);
app.get("/health", health);
app.post("/checkout", checkout);

const server = serve({
  port: 3000,
  fetch: app.fetch,
});

console.log(`Listening on http://localhost:${server.port}`);

process.on("SIGINT", async () => {
  server.stop();
  await destroy();
  process.exit(0);
});
