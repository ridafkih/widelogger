import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

const mockInfo = mock();
const mockError = mock();
const mockPino = mock(() => ({ info: mockInfo, error: mockError }));

mock.module("pino", () => ({
  default: Object.assign(mockPino, {
    transport: () => undefined,
    stdTimeFunctions: { isoTime: () => "" },
  }),
}));

const { widelogger, widelog } = await import("./index");

const createLogger = () =>
  widelogger({ service: "test", defaultEventName: "test.event" });

const lastInfoPayload = () => mockInfo.mock.calls.at(-1)?.[0];

const lastErrorPayload = () => mockError.mock.calls.at(-1)?.[0];

const lastPinoConfig = () => mockPino.mock.calls.at(-1)?.at(0);

beforeEach(() => {
  mockInfo.mockClear();
  mockError.mockClear();
  mockPino.mockClear();
});

describe("widelogger factory", () => {
  it("returns context and destroy", () => {
    const logger = createLogger();
    expect(typeof logger.context).toBe("function");
    expect(typeof logger.destroy).toBe("function");
  });
});

describe("widelog module export", () => {
  it("exports all widelog methods", () => {
    expect(typeof widelog.set).toBe("function");
    expect(typeof widelog.setFields).toBe("function");
    expect(typeof widelog.count).toBe("function");
    expect(typeof widelog.append).toBe("function");
    expect(typeof widelog.max).toBe("function");
    expect(typeof widelog.min).toBe("function");
    expect(typeof widelog.flush).toBe("function");
    expect(typeof widelog.time.start).toBe("function");
    expect(typeof widelog.time.stop).toBe("function");
    expect(typeof widelog.time.measure).toBe("function");
    expect(typeof widelog.errorFields).toBe("function");
  });
});

describe("context", () => {
  it("returns sync callback return value", () => {
    const logger = createLogger();
    const result = logger.context(() => 42);
    expect(result).toBe(42);
  });

  it("returns async callback resolved value", async () => {
    const logger = createLogger();
    const result = await logger.context(async () => 42);
    expect(result).toBe(42);
  });

  it("isolates operations between concurrent async contexts", async () => {
    const logger = createLogger();

    const contextA = logger.context(async () => {
      widelog.set("request_id", "aaa");
      await new Promise((resolve) => setTimeout(resolve, 10));
      widelog.flush();
    });

    const contextB = logger.context(async () => {
      widelog.set("request_id", "bbb");
      await Promise.resolve();
      widelog.flush();
    });

    await Promise.all([contextA, contextB]);

    const calls = mockInfo.mock.calls;
    expect(calls).toHaveLength(2);

    const payloads = calls.map(
      (c: unknown[]) => c[0] as Record<string, unknown>
    );
    const ids = payloads.map((p) => p.request_id);
    expect(ids).toContain("aaa");
    expect(ids).toContain("bbb");
  });
});

describe("widelog operations outside context", () => {
  it("set is a silent no-op", () => {
    expect(() => widelog.set("key", "value")).not.toThrow();
  });

  it("count is a silent no-op", () => {
    expect(() => widelog.count("key")).not.toThrow();
  });

  it("append is a silent no-op", () => {
    expect(() => widelog.append("key", "value")).not.toThrow();
  });

  it("max is a silent no-op", () => {
    expect(() => widelog.max("key", 1)).not.toThrow();
  });

  it("min is a silent no-op", () => {
    expect(() => widelog.min("key", 1)).not.toThrow();
  });

  it("time.start is a silent no-op", () => {
    expect(() => widelog.time.start("key")).not.toThrow();
  });

  it("time.stop is a silent no-op", () => {
    expect(() => widelog.time.stop("key")).not.toThrow();
  });

  it("errorFields is a silent no-op", () => {
    expect(() => widelog.errorFields(new Error("test"))).not.toThrow();
  });

  it("flush does not log when called outside context", () => {
    widelog.flush();
    expect(mockInfo).not.toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();
  });
});

describe("widelog.set", () => {
  it("records a set operation visible on flush", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.set("method", "GET");
      widelog.flush();
    });
    expect(mockInfo).toHaveBeenCalledTimes(1);
    expect(lastInfoPayload().method).toBe("GET");
  });
});

describe("widelog.setFields", () => {
  it("flattens nested fields using dot notation", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.setFields({
        account: { age_days: 10, plan: "pro" },
        status_code: 200,
      });
      widelog.flush();
    });

    const payload = lastInfoPayload();
    expect(payload.status_code).toBe(200);
    expect(payload.account).toEqual({ age_days: 10, plan: "pro" });
  });

  it("ignores non-primitive and unsupported values", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.setFields({
        empty: null,
        nested: {
          ok: "yes",
          bad: new Date(),
        },
      });
      widelog.flush();
    });

    const payload = lastInfoPayload();
    expect(payload.nested).toEqual({ ok: "yes" });
    expect(payload.empty).toBeUndefined();
  });

  it("converts arrays of primitives into append operations", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.setFields({
        tags: ["api", "sync"],
        counts: [1, 2, 3],
      });
      widelog.flush();
    });

    const payload = lastInfoPayload();
    expect(payload.tags).toEqual(["api", "sync"]);
    expect(payload.counts).toEqual([1, 2, 3]);
  });

  it("ignores arrays containing non-primitive values", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.setFields({
        valid_field: "present",
        mixed: [{ nested: true }, "valid"],
      });
      widelog.flush();
    });

    const payload = lastInfoPayload();
    expect(payload.valid_field).toBe("present");
    expect(payload.mixed).toBeUndefined();
  });
});

describe("widelog.count", () => {
  it("defaults amount to 1", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.count("hits");
      widelog.count("hits");
      widelog.flush();
    });
    expect(lastInfoPayload().hits).toBe(2);
  });

  it("records a count with custom amount", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.count("queries", 5);
      widelog.flush();
    });
    expect(lastInfoPayload().queries).toBe(5);
  });
});

describe("widelog.append", () => {
  it("records append operations visible on flush", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.append("tags", "api");
      widelog.append("tags", "v2");
      widelog.flush();
    });
    expect(lastInfoPayload().tags).toEqual(["api", "v2"]);
  });
});

describe("widelog.max", () => {
  it("records max operation visible on flush", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.max("size", 100);
      widelog.max("size", 200);
      widelog.flush();
    });
    expect(lastInfoPayload().size).toBe(200);
  });
});

describe("widelog.min", () => {
  it("records min operation visible on flush", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.min("latency", 50);
      widelog.min("latency", 10);
      widelog.flush();
    });
    expect(lastInfoPayload().latency).toBe(10);
  });
});

describe("widelog.time", () => {
  it("uses performance.now for start and stop timestamps", () => {
    const nowSpy = spyOn(performance, "now");
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1150);

    const logger = createLogger();
    logger.context(() => {
      widelog.time.start("duration");
      widelog.time.stop("duration");
      widelog.flush();
    });

    expect(lastInfoPayload().duration).toBe(150);
    nowSpy.mockRestore();
  });

  it("measures sync callback duration", () => {
    const nowSpy = spyOn(performance, "now");
    nowSpy.mockReturnValueOnce(3000).mockReturnValueOnce(3099);

    const logger = createLogger();
    logger.context(() => {
      const result = widelog.time.measure("duration", () => "ok");
      expect(result).toBe("ok");
      widelog.flush();
    });

    expect(lastInfoPayload().duration).toBe(99);
    nowSpy.mockRestore();
  });

  it("measures async callback duration", async () => {
    const nowSpy = spyOn(performance, "now");
    nowSpy.mockReturnValueOnce(900).mockReturnValueOnce(1142);

    const logger = createLogger();
    await logger.context(async () => {
      const result = await widelog.time.measure("duration", async () => "done");
      expect(result).toBe("done");
      widelog.flush();
    });

    expect(lastInfoPayload().duration).toBe(242);
    nowSpy.mockRestore();
  });

  it("still stops timing when callback throws", () => {
    const nowSpy = spyOn(performance, "now");
    nowSpy.mockReturnValueOnce(100).mockReturnValueOnce(120);

    const logger = createLogger();
    expect(() =>
      logger.context(() => {
        widelog.time.measure("duration", () => {
          throw new Error("boom");
        });
      })
    ).toThrow("boom");

    logger.context(() => {
      widelog.flush();
    });

    expect(mockInfo).not.toHaveBeenCalled();
    nowSpy.mockRestore();
  });
});

describe("widelog.errorFields", () => {
  it("extracts fields from an Error instance", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.errorFields(new TypeError("bad input"));
      widelog.flush();
    });
    const error = lastInfoPayload().error as Record<string, unknown>;
    expect(error.error_name).toBe("TypeError");
    expect(error.error_message).toBe("bad input");
    expect(typeof error.error_stack).toBe("string");
  });

  it("handles string errors", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.errorFields("something broke");
      widelog.flush();
    });
    const error = lastInfoPayload().error as Record<string, unknown>;
    expect(error.error_name).toBe("Error");
    expect(error.error_message).toBe("something broke");
  });

  it("handles unknown error types", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.errorFields(null);
      widelog.flush();
    });
    const error = lastInfoPayload().error as Record<string, unknown>;
    expect(error.error_name).toBe("UnknownError");
    expect(error.error_message).toBe("Unknown error");
  });

  it("uses custom prefix", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.errorFields(new Error("fail"), { prefix: "db" });
      widelog.flush();
    });
    const db = lastInfoPayload().db as Record<string, unknown>;
    expect(db.error_name).toBe("Error");
    expect(db.error_message).toBe("fail");
  });

  it("excludes stack when includeStack is false", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.errorFields(new Error("fail"), { includeStack: false });
      widelog.flush();
    });
    const error = lastInfoPayload().error as Record<string, unknown>;
    expect(error.error_stack).toBeUndefined();
  });

  it("sets slug from options", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.errorFields(new Error("fail"), { slug: "provider-auth-failed" });
      widelog.flush();
    });
    const error = lastInfoPayload().error as Record<string, unknown>;
    expect(error.slug).toBe("provider-auth-failed");
  });

  it("sets retriable from options", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.errorFields(new Error("fail"), { retriable: false });
      widelog.flush();
    });
    const error = lastInfoPayload().error as Record<string, unknown>;
    expect(error.retriable).toBe(false);
  });

  it("sets requires_reauth from options", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.errorFields(new Error("fail"), { requiresReauth: true });
      widelog.flush();
    });
    const error = lastInfoPayload().error as Record<string, unknown>;
    expect(error.requires_reauth).toBe(true);
  });

  it("infers slug from error object property", () => {
    const logger = createLogger();
    const error = Object.assign(new Error("fail"), {
      slug: "calendar-not-found",
    });
    logger.context(() => {
      widelog.errorFields(error);
      widelog.flush();
    });
    const payload = lastInfoPayload().error as Record<string, unknown>;
    expect(payload.slug).toBe("calendar-not-found");
  });

  it("infers retriable from error object property", () => {
    const logger = createLogger();
    const error = Object.assign(new Error("fail"), { retriable: true });
    logger.context(() => {
      widelog.errorFields(error);
      widelog.flush();
    });
    const payload = lastInfoPayload().error as Record<string, unknown>;
    expect(payload.retriable).toBe(true);
  });

  it("explicit options override inferred error properties", () => {
    const logger = createLogger();
    const error = Object.assign(new Error("fail"), {
      slug: "from-error",
      retriable: true,
    });
    logger.context(() => {
      widelog.errorFields(error, {
        slug: "from-options",
        retriable: false,
      });
      widelog.flush();
    });
    const payload = lastInfoPayload().error as Record<string, unknown>;
    expect(payload.slug).toBe("from-options");
    expect(payload.retriable).toBe(false);
  });

  it("does not set slug or retriable when not provided", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.errorFields(new Error("plain error"));
      widelog.flush();
    });
    const error = lastInfoPayload().error as Record<string, unknown>;
    expect(error.slug).toBeUndefined();
    expect(error.retriable).toBeUndefined();
    expect(error.requires_reauth).toBeUndefined();
  });
});

describe("widelog.set().sticky()", () => {
  it("sticky fields persist across multiple flushes", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.set("job_id", "abc").sticky();

      widelog.set("item", "first");
      widelog.flush();
      const firstPayload = lastInfoPayload();

      widelog.set("item", "second");
      widelog.flush();
      const secondPayload = lastInfoPayload();

      expect(firstPayload.job_id).toBe("abc");
      expect(firstPayload.item).toBe("first");
      expect(secondPayload.job_id).toBe("abc");
      expect(secondPayload.item).toBe("second");
    });
  });

  it("non-sticky fields are cleared after flush", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.set("job_id", "abc").sticky();
      widelog.set("transient", "gone");
      widelog.flush();

      widelog.flush();
      const secondPayload = lastInfoPayload();

      expect(secondPayload.job_id).toBe("abc");
      expect(secondPayload.transient).toBeUndefined();
    });
  });

  it("per-flush values override sticky values on the same key", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.set("status", "ok").sticky();

      widelog.set("status", "overridden");
      widelog.flush();
      const payload = lastInfoPayload();

      expect(payload.status).toBe("overridden");
    });
  });
});

describe("widelog.setFields().sticky()", () => {
  it("makes all fields from setFields sticky", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog
        .setFields({
          operation: { name: "ingest", type: "job" },
        })
        .sticky();

      widelog.set("item", "first");
      widelog.flush();
      const firstPayload = lastInfoPayload();

      widelog.set("item", "second");
      widelog.flush();
      const secondPayload = lastInfoPayload();

      expect(firstPayload.operation).toEqual({ name: "ingest", type: "job" });
      expect(firstPayload.item).toBe("first");
      expect(secondPayload.operation).toEqual({ name: "ingest", type: "job" });
      expect(secondPayload.item).toBe("second");
    });
  });
});

describe("widelog.flush log routing", () => {
  it("calls logger.info for non-error events", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.set("status_code", 200);
      widelog.flush();
    });
    expect(mockInfo).toHaveBeenCalledTimes(1);
    expect(mockError).not.toHaveBeenCalled();
  });

  it("calls logger.error when status_code >= 500", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.set("status_code", 500);
      widelog.flush();
    });
    expect(mockError).toHaveBeenCalledTimes(1);
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("calls logger.error when outcome is error and no status_code", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.set("outcome", "error");
      widelog.flush();
    });
    expect(mockError).toHaveBeenCalledTimes(1);
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("status_code takes precedence over outcome", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.set("status_code", 200);
      widelog.set("outcome", "error");
      widelog.flush();
    });
    expect(mockInfo).toHaveBeenCalledTimes(1);
    expect(mockError).not.toHaveBeenCalled();
  });

  it("does not log when event is empty", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.flush();
    });
    expect(mockInfo).not.toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();
  });

  it("includes event_name from defaultEventName", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.set("key", "value");
      widelog.flush();
    });
    expect(lastInfoPayload().event_name).toBe("test.event");
  });
});

describe("full pipeline integration", () => {
  it("records a complete HTTP request lifecycle", () => {
    const nowSpy = spyOn(performance, "now");
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1042);

    const logger = createLogger();
    logger.context(() => {
      widelog.set("method", "GET");
      widelog.set("path", "/api/users");
      widelog.count("db.queries", 3);
      widelog.time.start("duration");
      widelog.time.stop("duration");
      widelog.append("tags", "api");
      widelog.append("tags", "users");
      widelog.max("response.size", 1024);
      widelog.set("status_code", 200);
      widelog.flush();
    });

    expect(mockInfo).toHaveBeenCalledTimes(1);
    const payload = lastInfoPayload();
    expect(payload.event_name).toBe("test.event");
    expect(payload.method).toBe("GET");
    expect(payload.path).toBe("/api/users");
    expect(payload.status_code).toBe(200);
    expect(payload.tags).toEqual(["api", "users"]);
    expect(payload.duration).toBe(42);

    const db = payload.db as Record<string, unknown>;
    expect(db.queries).toBe(3);

    const response = payload.response as Record<string, unknown>;
    expect(response.size).toBe(1024);

    nowSpy.mockRestore();
  });

  it("records an error request lifecycle", () => {
    const logger = createLogger();
    logger.context(() => {
      widelog.set("method", "POST");
      widelog.set("path", "/api/create");
      widelog.errorFields(new Error("DB connection failed"));
      widelog.set("status_code", 500);
      widelog.flush();
    });

    expect(mockError).toHaveBeenCalledTimes(1);
    expect(mockInfo).not.toHaveBeenCalled();

    const payload = lastErrorPayload();
    expect(payload.method).toBe("POST");
    expect(payload.status_code).toBe(500);

    const error = payload.error as Record<string, unknown>;
    expect(error.error_name).toBe("Error");
    expect(error.error_message).toBe("DB connection failed");
    expect(typeof error.error_stack).toBe("string");
  });

  it("handles concurrent requests without context leakage", async () => {
    const logger = createLogger();

    await Promise.all([
      logger.context(async () => {
        widelog.set("id", "first");
        widelog.count("n", 1);
        await new Promise((resolve) => setTimeout(resolve, 10));
        widelog.flush();
      }),
      logger.context(async () => {
        widelog.set("id", "second");
        widelog.count("n", 100);
        await Promise.resolve();
        widelog.flush();
      }),
    ]);

    const calls = [...mockInfo.mock.calls];
    expect(calls).toHaveLength(2);

    const payloads = calls.map(
      (c: unknown[]) => c[0] as Record<string, unknown>
    );
    const first = payloads.find((p) => p.id === "first");
    const second = payloads.find((p) => p.id === "second");

    expect(first).toBeDefined();
    expect(first?.n).toBe(1);
    expect(second).toBeDefined();
    expect(second?.n).toBe(100);
  });

  it("routes to the correct logger when multiple factories exist", () => {
    const loggerA = widelogger({
      service: "service-a",
      defaultEventName: "event.a",
    });
    const loggerB = widelogger({
      service: "service-b",
      defaultEventName: "event.b",
    });

    loggerA.context(() => {
      widelog.set("source", "a");
      widelog.flush();
    });

    loggerB.context(() => {
      widelog.set("source", "b");
      widelog.flush();
    });

    const payloads = mockInfo.mock.calls.map(
      (c: unknown[]) => c[0] as Record<string, unknown>
    );

    const payloadA = payloads.find((p) => p.source === "a");
    const payloadB = payloads.find((p) => p.source === "b");

    expect(payloadA?.event_name).toBe("event.a");
    expect(payloadB?.event_name).toBe("event.b");
  });
});

describe("environment defaults", () => {
  it("uses NODE_ENV when environment option is omitted", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const logger = widelogger({
      service: "test-service",
      defaultEventName: "test.event",
    });

    logger.context(() => {
      widelog.set("status_code", 200);
      widelog.flush();
    });

    const config: unknown = lastPinoConfig();
    expect(config).toBeDefined();

    if (typeof config !== "object" || config === null) {
      throw new Error("config was not defined");
    }

    if (
      !("base" in config) ||
      typeof config.base !== "object" ||
      config.base === null
    ) {
      throw new Error("config.base was not definedf");
    }

    if (!("environment" in config.base)) {
      throw new Error("config.base was not definedf");
    }

    const base = config.base;
    expect(base.environment).toBe("production");
    process.env.NODE_ENV = previousNodeEnv;
  });
});
