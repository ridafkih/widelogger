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
// src/logger.ts
import { widelogger } from "widelogger";

export const { widelog, destroy } = widelogger({
  service: "checkout-api",
  defaultEventName: "http_request",
});
```

```ts
// src/middleware/logging.ts
import { widelog } from "../logger";

export const logging = (request, response, next) => {
  widelog.context(
    () =>
      new Promise((resolve) => {
        widelog.set("method", request.method);
        widelog.set("path", request.path);
        widelog.time.start("duration_ms");

        response.on("finish", () => {
          widelog.set("status_code", response.statusCode);
          widelog.time.stop("duration_ms");
          widelog.flush();
          resolve();
        });

        next();
      }),
  );
};
```

```ts
// src/routes/checkout.ts
import { widelog } from "../logger";

export const checkout = (request, response) => {
  const { userId } = request.body;

  widelog.set("user.id", userId);
  widelog.set("user.plan", "premium");

  widelog.time.start("db_ms");
  const order = await processOrder(userId);
  widelog.time.stop("db_ms");

  widelog.set("order.total_cents", order.totalCents);
  widelog.count("order.items", order.itemCount);

  response.json({ orderId: order.id });
};
```

The handler doesn't need to know about context setup or flushing — it just imports `widelog` and adds fields. `AsyncLocalStorage` ensures concurrent requests never leak into each other.

### Bun

The same pattern works with Bun's built-in server.

```ts
// src/logger.ts
import { widelogger } from "widelogger";

export const { widelog, destroy } = widelogger({
  service: "checkout-api",
  defaultEventName: "http_request",
});
```

```ts
// src/routes/checkout.ts
import { widelog } from "../logger";

export const checkout = async (request: Request) => {
  const { userId } = await request.json();

  widelog.set("user.id", userId);
  widelog.set("user.plan", "premium");

  widelog.time.start("db_ms");
  const order = await processOrder(userId);
  widelog.time.stop("db_ms");

  widelog.set("order.total_cents", order.totalCents);
  widelog.count("order.items", order.itemCount);

  return Response.json({ orderId: order.id });
};
```

```ts
// src/server.ts
import { serve } from "bun";
import { widelog } from "./logger";
import { checkout } from "./routes/checkout";

serve({
  fetch: (request) =>
    widelog.context(async () => {
      const url = new URL(request.url);
      widelog.set("method", request.method);
      widelog.set("path", url.pathname);
      widelog.time.start("duration_ms");

      try {
        const response = await checkout(request);
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
