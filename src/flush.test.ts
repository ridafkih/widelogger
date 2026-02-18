import { describe, expect, it } from "bun:test";
import { flush } from "./flush";
import type { Context, Operation } from "./types";

const context = (...operations: Operation[]): Context => ({ operations });

describe("flush", () => {
  it("returns empty object when context is undefined", () => {
    expect(flush(undefined)).toEqual({});
  });

  it("returns empty object when context has no operations", () => {
    expect(flush(context())).toEqual({});
  });

  it("clears the operations array after flushing", () => {
    const ctx = context({ operation: "set", key: "a", value: 1 });
    flush(ctx);
    expect(ctx.operations).toEqual([]);
  });
});

describe("set operation", () => {
  it("sets a flat key", () => {
    const result = flush(
      context({ operation: "set", key: "status", value: "ok" })
    );
    expect(result).toEqual({ status: "ok" });
  });

  it("sets a nested key via dotted notation", () => {
    const result = flush(
      context({ operation: "set", key: "user.id", value: 42 })
    );
    expect(result).toEqual({ user: { id: 42 } });
  });

  it("sets a deeply nested key", () => {
    const result = flush(
      context({ operation: "set", key: "a.b.c.d", value: true })
    );
    expect(result).toEqual({ a: { b: { c: { d: true } } } });
  });

  it("last set wins on the same key", () => {
    const result = flush(
      context(
        { operation: "set", key: "status", value: "first" },
        { operation: "set", key: "status", value: "second" }
      )
    );
    expect(result).toEqual({ status: "second" });
  });

  it("handles string values", () => {
    const result = flush(
      context({ operation: "set", key: "name", value: "alice" })
    );
    expect(result.name).toBe("alice");
  });

  it("handles numeric values", () => {
    const result = flush(
      context({ operation: "set", key: "count", value: 123 })
    );
    expect(result.count).toBe(123);
  });

  it("handles boolean values", () => {
    const result = flush(
      context({ operation: "set", key: "active", value: true })
    );
    expect(result.active).toBe(true);
  });

  it("replaces non-object intermediate with object when nesting conflicts", () => {
    const result = flush(
      context(
        { operation: "set", key: "a", value: "string" },
        { operation: "set", key: "a.b", value: 1 }
      )
    );
    expect(result).toEqual({ a: { b: 1 } });
  });
});

describe("count operation", () => {
  it("sets a single count value", () => {
    const result = flush(
      context({ operation: "count", key: "requests", amount: 5 })
    );
    expect(result).toEqual({ requests: 5 });
  });

  it("accumulates multiple counts on the same key", () => {
    const result = flush(
      context(
        { operation: "count", key: "requests", amount: 3 },
        { operation: "count", key: "requests", amount: 7 }
      )
    );
    expect(result).toEqual({ requests: 10 });
  });

  it("supports negative amounts", () => {
    const result = flush(
      context(
        { operation: "count", key: "balance", amount: 10 },
        { operation: "count", key: "balance", amount: -3 }
      )
    );
    expect(result).toEqual({ balance: 7 });
  });

  it("supports dotted keys", () => {
    const result = flush(
      context({ operation: "count", key: "http.requests", amount: 1 })
    );
    expect(result).toEqual({ http: { requests: 1 } });
  });
});

describe("append operation", () => {
  it("creates an array with a single element", () => {
    const result = flush(
      context({ operation: "append", key: "tags", value: "api" })
    );
    expect(result).toEqual({ tags: ["api"] });
  });

  it("appends multiple values into an array", () => {
    const result = flush(
      context(
        { operation: "append", key: "tags", value: "api" },
        { operation: "append", key: "tags", value: "v2" },
        { operation: "append", key: "tags", value: "public" }
      )
    );
    expect(result).toEqual({ tags: ["api", "v2", "public"] });
  });

  it("supports mixed FieldValue types", () => {
    const result = flush(
      context(
        { operation: "append", key: "data", value: "text" },
        { operation: "append", key: "data", value: 42 },
        { operation: "append", key: "data", value: true }
      )
    );
    expect(result).toEqual({ data: ["text", 42, true] });
  });

  it("supports dotted keys", () => {
    const result = flush(
      context({ operation: "append", key: "user.roles", value: "admin" })
    );
    expect(result).toEqual({ user: { roles: ["admin"] } });
  });
});

describe("max operation", () => {
  it("tracks the maximum across multiple values", () => {
    const result = flush(
      context(
        { operation: "max", key: "peak", value: 3 },
        { operation: "max", key: "peak", value: 7 },
        { operation: "max", key: "peak", value: 1 }
      )
    );
    expect(result).toEqual({ peak: 7 });
  });

  it("initializes with the first value", () => {
    const result = flush(context({ operation: "max", key: "peak", value: 42 }));
    expect(result).toEqual({ peak: 42 });
  });

  it("keeps current when new value is smaller", () => {
    const result = flush(
      context(
        { operation: "max", key: "peak", value: 10 },
        { operation: "max", key: "peak", value: 5 }
      )
    );
    expect(result).toEqual({ peak: 10 });
  });

  it("handles negative numbers", () => {
    const result = flush(
      context(
        { operation: "max", key: "temp", value: -5 },
        { operation: "max", key: "temp", value: -1 },
        { operation: "max", key: "temp", value: -10 }
      )
    );
    expect(result).toEqual({ temp: -1 });
  });
});

describe("min operation", () => {
  it("tracks the minimum across multiple values", () => {
    const result = flush(
      context(
        { operation: "min", key: "low", value: 7 },
        { operation: "min", key: "low", value: 3 },
        { operation: "min", key: "low", value: 9 }
      )
    );
    expect(result).toEqual({ low: 3 });
  });

  it("initializes with the first value", () => {
    const result = flush(context({ operation: "min", key: "low", value: 42 }));
    expect(result).toEqual({ low: 42 });
  });

  it("keeps current when new value is larger", () => {
    const result = flush(
      context(
        { operation: "min", key: "low", value: 5 },
        { operation: "min", key: "low", value: 10 }
      )
    );
    expect(result).toEqual({ low: 5 });
  });

  it("handles negative numbers", () => {
    const result = flush(
      context(
        { operation: "min", key: "temp", value: -1 },
        { operation: "min", key: "temp", value: -10 },
        { operation: "min", key: "temp", value: -5 }
      )
    );
    expect(result).toEqual({ temp: -10 });
  });
});

describe("time operations", () => {
  it("computes elapsed time between start and stop", () => {
    const result = flush(
      context(
        { operation: "time.start", key: "duration", time: 100 },
        { operation: "time.stop", key: "duration", time: 250 }
      )
    );
    expect(result).toEqual({ duration: 150 });
  });

  it("rounds elapsed time to two decimal places", () => {
    const result = flush(
      context(
        { operation: "time.start", key: "duration", time: 100 },
        { operation: "time.stop", key: "duration", time: 100.456 }
      )
    );
    expect(result).toEqual({ duration: 0.46 });
  });

  it("time.stop without preceding time.start is a no-op", () => {
    const result = flush(
      context({ operation: "time.stop", key: "duration", time: 250 })
    );
    expect(result).toEqual({});
  });

  it("double time.stop is a no-op for the second stop", () => {
    const result = flush(
      context(
        { operation: "time.start", key: "duration", time: 100 },
        { operation: "time.stop", key: "duration", time: 200 },
        { operation: "time.stop", key: "duration", time: 300 }
      )
    );
    expect(result).toEqual({ duration: 100 });
  });

  it("accumulates across multiple start/stop pairs", () => {
    const result = flush(
      context(
        { operation: "time.start", key: "duration", time: 100 },
        { operation: "time.stop", key: "duration", time: 150 },
        { operation: "time.start", key: "duration", time: 200 },
        { operation: "time.stop", key: "duration", time: 280 }
      )
    );
    expect(result).toEqual({ duration: 130 });
  });

  it("time.start without time.stop yields accumulated 0", () => {
    const result = flush(
      context({ operation: "time.start", key: "duration", time: 100 })
    );
    expect(result).toEqual({ duration: 0 });
  });

  it("time.start with time 0 is treated as unstarted", () => {
    const result = flush(
      context(
        { operation: "time.start", key: "duration", time: 0 },
        { operation: "time.stop", key: "duration", time: 100 }
      )
    );
    expect(result).toEqual({ duration: 0 });
  });
});

describe("mixed operations", () => {
  it("processes all operation types together", () => {
    const result = flush(
      context(
        { operation: "set", key: "method", value: "GET" },
        { operation: "set", key: "path", value: "/api" },
        { operation: "count", key: "queries", amount: 3 },
        { operation: "append", key: "tags", value: "api" },
        { operation: "append", key: "tags", value: "v2" },
        { operation: "max", key: "response_size", value: 1024 },
        { operation: "min", key: "latency", value: 5 },
        { operation: "time.start", key: "duration", time: 1 },
        { operation: "time.stop", key: "duration", time: 43 }
      )
    );
    expect(result).toEqual({
      method: "GET",
      path: "/api",
      queries: 3,
      tags: ["api", "v2"],
      response_size: 1024,
      latency: 5,
      duration: 42,
    });
  });

  it("aggregator values overwrite set values on the same key", () => {
    const result = flush(
      context(
        { operation: "set", key: "x", value: "hello" },
        { operation: "count", key: "x", amount: 5 }
      )
    );
    expect(result).toEqual({ x: 5 });
  });
});
