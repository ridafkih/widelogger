import express from "express";
import { destroy } from "./logger";
import { logging } from "./middleware/logging";
import { checkout } from "./routes/checkout";
import { health } from "./routes/health";

const app = express();

app.use(express.json());
app.use(logging);

app.get("/health", health);
app.post("/checkout", checkout);

const server = app.listen(3000, () => {
  console.log("Listening on http://localhost:3000");
});

process.on("SIGINT", async () => {
  server.close();
  await destroy();
  process.exit(0);
});
