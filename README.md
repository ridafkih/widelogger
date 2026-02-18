<div align="center">
  <h1>widelogger</h1>
  <p>Structured wide event logging for Node.js.</p>
  <p>Accumulate context throughout a request lifecycle, then flush it as a single rich event — inspired by <a href="https://stripe.com/blog/canonical-log-lines">Stripe's canonical log lines</a>. Built on <a href="https://github.com/pinojs/pino">Pino</a> and <code>AsyncLocalStorage</code> for zero-leak context isolation across concurrent requests.</p>
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

### Logging a Request

Wrap each unit of work in a `context()`, accumulate fields as you go, then call `flush()` to emit a single structured event.

```ts
await widelog.context(async () => {
  widelog.set("method", "POST");
  widelog.set("path", "/checkout");
  widelog.set("user.id", "usr_123");
  widelog.set("user.plan", "premium");

  widelog.time.start("duration_ms");

  try {
    widelog.count("cart.items", 3);
    widelog.set("cart.total_cents", 14999);
    widelog.set("status_code", 200);
    widelog.set("outcome", "success");
  } catch (error) {
    widelog.set("status_code", 500);
    widelog.set("outcome", "error");
    widelog.errorFields(error);
  } finally {
    widelog.time.stop("duration_ms");
    widelog.flush();
  }
});
```

Instead of scattered `console.log` calls, this produces a single JSON log line containing service metadata, user info, cart details, timing, and outcome.

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
