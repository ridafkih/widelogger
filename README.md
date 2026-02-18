<div align="center">
  <h1>widelogger</h1>
  <p>Structured wide event logging for Node.js.</p>
  <p>Accumulate context throughout a request lifecycle, then flush it as a single rich event — inspired by <a href="https://loggingsucks.com">loggingsucks.com</a>. Built on <a href="https://github.com/pinojs/pino">Pino</a> and <code>AsyncLocalStorage</code> for zero-leak context isolation across concurrent requests.</p>
  <span>
    <a href="#installation">Installation</a>
    <span>&nbsp;&nbsp;·&nbsp;&nbsp;</span>
    <a href="#usage">Usage</a>
    <span>&nbsp;&nbsp;·&nbsp;&nbsp;</span>
    <a href="#api">API</a>
    <span>&nbsp;&nbsp;·&nbsp;&nbsp;</span>
    <a href="#contribute">Contribute</a>
  </span>
</div>
<hr>

## Installation

To install widelogger, simply use your favourite Node.js package manager.

```bash
bun add widelogger
```

```bash
pnpm add widelogger
```

```bash
yarn add widelogger
```

```bash
npm install widelogger
```

## Usage

### Creating a Logger

```ts
import { widelogger } from "widelogger";

const { widelog, destroy } = widelogger({
  service: "checkout-api",
  defaultEventName: "http_request",
  version: "1.0.0",
  commitHash: process.env.COMMIT_SHA,
});
```

### Express

Create a shared logger instance, use middleware to wrap requests in a context, and accumulate fields from anywhere in your codebase.

```ts
// lib/logger.ts
import { widelogger } from "widelogger";

const { widelog, destroy } = widelogger({
  service: "checkout-api",
  defaultEventName: "http_request",
});

export { widelog, destroy };
```

```ts
// middleware/logging.ts
import { widelog } from "../lib/logger";

export const loggingMiddleware = (req, res, next) => {
  widelog.context(() => {
    widelog.set("method", req.method);
    widelog.set("path", req.path);
    widelog.time.start("duration_ms");

    res.on("finish", () => {
      widelog.set("status_code", res.statusCode);
      widelog.time.stop("duration_ms");
      widelog.flush();
    });

    next();
  });
};
```

```ts
// routes/checkout.ts
import { widelog } from "../lib/logger";

export const checkout = async (req, res) => {
  const user = await getUser(req.userId);
  widelog.set("user.id", user.id);
  widelog.set("user.plan", user.plan);

  try {
    const order = await processOrder(user);
    widelog.set("order.total_cents", order.totalCents);
    widelog.count("order.items", order.items.length);
    widelog.set("outcome", "success");
    res.json({ orderId: order.id });
  } catch (error) {
    widelog.set("outcome", "error");
    widelog.errorFields(error);
    res.status(500).json({ error: "checkout failed" });
  }
};
```

The handler doesn't need to know about context setup or flushing — it just imports `widelog` and adds fields. `AsyncLocalStorage` ensures concurrent requests never leak into each other.

### Bun

The same pattern works with Bun's built-in server.

```ts
// lib/logger.ts
import { widelogger } from "widelogger";

const { widelog, destroy } = widelogger({
  service: "checkout-api",
  defaultEventName: "http_request",
});

export { widelog, destroy };
```

```ts
// routes/checkout.ts
import { widelog } from "../lib/logger";

export const checkout = async (req: Request) => {
  const user = await getUser(req);
  widelog.set("user.id", user.id);
  widelog.set("user.plan", user.plan);

  const order = await processOrder(user);
  widelog.set("order.total_cents", order.totalCents);
  widelog.count("order.items", order.items.length);

  return Response.json({ orderId: order.id });
};
```

```ts
// server.ts
import { widelog } from "./lib/logger";
import { checkout } from "./routes/checkout";

Bun.serve({
  fetch: (req) =>
    widelog.context(async () => {
      const url = new URL(req.url);
      widelog.set("method", req.method);
      widelog.set("path", url.pathname);
      widelog.time.start("duration_ms");

      try {
        const response = await checkout(req);
        widelog.set("status_code", response.status);
        widelog.set("outcome", "success");
        return response;
      } catch (error) {
        widelog.set("outcome", "error");
        widelog.set("status_code", 500);
        widelog.errorFields(error);
        return Response.json({ error: "checkout failed" }, { status: 500 });
      } finally {
        widelog.time.stop("duration_ms");
        widelog.flush();
      }
    }),
});
```

Instead of scattered `console.log` calls, each request produces a single JSON log line containing service metadata, user info, order details, timing, and outcome.

You can see full working examples in the [examples/](./examples) directory for [Bun](./examples/bun), [Express](./examples/express), [Hono](./examples/hono), and [Fastify](./examples/fastify).

### Dot Notation

Keys use dot notation which expands to nested objects in the output. Keys are type-checked at compile time — empty strings, leading/trailing dots, and double dots are all rejected.

```ts
widelog.set("user.id", "usr_123");
widelog.set("user.plan", "premium");
// Output: { user: { id: "usr_123", plan: "premium" } }
```

### Log Routing

Events with `status_code >= 500` or `outcome === "error"` are emitted at `error` level. Everything else is `info`. In development, logs are pretty-printed; in production, they're structured JSON.

## API

### `widelogger(options)`

Creates a logger instance. Returns `{ widelog, destroy }`.

| Option | Type | Description |
|--------|------|-------------|
| `service` | `string` | Service name (required) |
| `defaultEventName` | `string` | Event name included in every log (required) |
| `version` | `string` | Service version |
| `commitHash` | `string` | Git commit hash (defaults to `"unknown"`) |
| `instanceId` | `string` | Instance identifier (defaults to `process.pid`) |
| `environment` | `string` | Environment name (defaults to `NODE_ENV`) |
| `level` | `string` | Log level (defaults to `LOG_LEVEL` env or `"info"`) |

### `widelog`

| Method | Description |
|--------|-------------|
| `context(fn)` | Run a function in an isolated async context |
| `set(key, value)` | Set a field value (last write wins) |
| `count(key, amount?)` | Increment a counter (default +1) |
| `append(key, value)` | Append a value to an array |
| `max(key, value)` | Track the maximum value for a key |
| `min(key, value)` | Track the minimum value for a key |
| `time.start(key)` | Start a timer |
| `time.stop(key)` | Stop a timer and record elapsed ms |
| `errorFields(error, opts?)` | Extract error name, message, and stack |
| `flush()` | Aggregate all operations and emit the event |

All methods are safe no-ops when called outside a `context()`.

### `destroy()`

Flushes the underlying Pino logger and closes transports. Call this on graceful shutdown.

## Contribute

Feel free to contribute to the repository. Pull requests and issues with feature requests are _super_ welcome!
