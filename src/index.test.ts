import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

const mockInfo = mock();
const mockError = mock();

mock.module("pino", () => ({
  default: Object.assign(() => ({ info: mockInfo, error: mockError }), {
    transport: () => undefined,
    stdTimeFunctions: { isoTime: () => "" },
  }),
}));

const { widelogger } = await import("./index");

const createLogger = () =>
  widelogger({ service: "test", defaultEventName: "test.event" });

const lastInfoPayload = () =>
  mockInfo.mock.calls.at(-1)?.[0] as Record<string, unknown>;

const lastErrorPayload = () =>
  mockError.mock.calls.at(-1)?.[0] as Record<string, unknown>;

beforeEach(() => {
  mockInfo.mockClear();
  mockError.mockClear();
});

describe("widelogger factory", () => {
  it("returns an object with a widelog property", () => {
    const { widelog } = createLogger();
    expect(widelog).toBeDefined();
    expect(typeof widelog.set).toBe("function");
    expect(typeof widelog.count).toBe("function");
    expect(typeof widelog.append).toBe("function");
    expect(typeof widelog.max).toBe("function");
    expect(typeof widelog.min).toBe("function");
    expect(typeof widelog.flush).toBe("function");
    expect(typeof widelog.context).toBe("function");
    expect(typeof widelog.time.start).toBe("function");
    expect(typeof widelog.time.stop).toBe("function");
    expect(typeof widelog.errorFields).toBe("function");
  });
});

describe("widelog.context", () => {
  it("returns sync callback return value", () => {
    const { widelog } = createLogger();
    const result = widelog.context(() => 42);
    expect(result).toBe(42);
  });

  it("returns async callback resolved value", async () => {
    const { widelog } = createLogger();
    const result = await widelog.context(async () => 42);
    expect(result).toBe(42);
  });

  it("isolates operations between concurrent async contexts", async () => {
    const { widelog } = createLogger();

    const contextA = widelog.context(async () => {
      widelog.set("request_id", "aaa");
      await new Promise((resolve) => setTimeout(resolve, 10));
      widelog.flush();
    });

    const contextB = widelog.context(async () => {
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
    const { widelog } = createLogger();
    expect(() => widelog.set("key", "value")).not.toThrow();
  });

  it("count is a silent no-op", () => {
    const { widelog } = createLogger();
    expect(() => widelog.count("key")).not.toThrow();
  });

  it("append is a silent no-op", () => {
    const { widelog } = createLogger();
    expect(() => widelog.append("key", "value")).not.toThrow();
  });

  it("max is a silent no-op", () => {
    const { widelog } = createLogger();
    expect(() => widelog.max("key", 1)).not.toThrow();
  });

  it("min is a silent no-op", () => {
    const { widelog } = createLogger();
    expect(() => widelog.min("key", 1)).not.toThrow();
  });

  it("time.start is a silent no-op", () => {
    const { widelog } = createLogger();
    expect(() => widelog.time.start("key")).not.toThrow();
  });

  it("time.stop is a silent no-op", () => {
    const { widelog } = createLogger();
    expect(() => widelog.time.stop("key")).not.toThrow();
  });

  it("errorFields is a silent no-op", () => {
    const { widelog } = createLogger();
    expect(() => widelog.errorFields(new Error("test"))).not.toThrow();
  });

  it("flush does not log when called outside context", () => {
    const { widelog } = createLogger();
    widelog.flush();
    expect(mockInfo).not.toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();
  });
});

describe("widelog.set", () => {
  it("records a set operation visible on flush", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.set("method", "GET");
      widelog.flush();
    });
    expect(mockInfo).toHaveBeenCalledTimes(1);
    expect(lastInfoPayload().method).toBe("GET");
  });
});

describe("widelog.count", () => {
  it("defaults amount to 1", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.count("hits");
      widelog.count("hits");
      widelog.flush();
    });
    expect(lastInfoPayload().hits).toBe(2);
  });

  it("records a count with custom amount", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.count("queries", 5);
      widelog.flush();
    });
    expect(lastInfoPayload().queries).toBe(5);
  });
});

describe("widelog.append", () => {
  it("records append operations visible on flush", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.append("tags", "api");
      widelog.append("tags", "v2");
      widelog.flush();
    });
    expect(lastInfoPayload().tags).toEqual(["api", "v2"]);
  });
});

describe("widelog.max", () => {
  it("records max operation visible on flush", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.max("size", 100);
      widelog.max("size", 200);
      widelog.flush();
    });
    expect(lastInfoPayload().size).toBe(200);
  });
});

describe("widelog.min", () => {
  it("records min operation visible on flush", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
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

    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.time.start("duration");
      widelog.time.stop("duration");
      widelog.flush();
    });

    expect(lastInfoPayload().duration).toBe(150);
    nowSpy.mockRestore();
  });
});

describe("widelog.errorFields", () => {
  it("extracts fields from an Error instance", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.errorFields(new TypeError("bad input"));
      widelog.flush();
    });
    const error = lastInfoPayload().error as Record<string, unknown>;
    expect(error.error_name).toBe("TypeError");
    expect(error.error_message).toBe("bad input");
    expect(typeof error.error_stack).toBe("string");
  });

  it("handles string errors", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.errorFields("something broke");
      widelog.flush();
    });
    const error = lastInfoPayload().error as Record<string, unknown>;
    expect(error.error_name).toBe("Error");
    expect(error.error_message).toBe("something broke");
  });

  it("handles unknown error types", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.errorFields(null);
      widelog.flush();
    });
    const error = lastInfoPayload().error as Record<string, unknown>;
    expect(error.error_name).toBe("UnknownError");
    expect(error.error_message).toBe("Unknown error");
  });

  it("uses custom prefix", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.errorFields(new Error("fail"), { prefix: "db" });
      widelog.flush();
    });
    const db = lastInfoPayload().db as Record<string, unknown>;
    expect(db.error_name).toBe("Error");
    expect(db.error_message).toBe("fail");
  });

  it("excludes stack when includeStack is false", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.errorFields(new Error("fail"), { includeStack: false });
      widelog.flush();
    });
    const error = lastInfoPayload().error as Record<string, unknown>;
    expect(error.error_stack).toBeUndefined();
  });
});

describe("widelog.flush log routing", () => {
  it("calls logger.info for non-error events", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.set("status_code", 200);
      widelog.flush();
    });
    expect(mockInfo).toHaveBeenCalledTimes(1);
    expect(mockError).not.toHaveBeenCalled();
  });

  it("calls logger.error when status_code >= 500", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.set("status_code", 500);
      widelog.flush();
    });
    expect(mockError).toHaveBeenCalledTimes(1);
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("calls logger.error when outcome is error and no status_code", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.set("outcome", "error");
      widelog.flush();
    });
    expect(mockError).toHaveBeenCalledTimes(1);
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("status_code takes precedence over outcome", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.set("status_code", 200);
      widelog.set("outcome", "error");
      widelog.flush();
    });
    expect(mockInfo).toHaveBeenCalledTimes(1);
    expect(mockError).not.toHaveBeenCalled();
  });

  it("does not log when event is empty", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
      widelog.flush();
    });
    expect(mockInfo).not.toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();
  });

  it("includes event_name from defaultEventName", () => {
    const { widelog } = createLogger();
    widelog.context(() => {
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

    const { widelog } = createLogger();
    widelog.context(() => {
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
    const { widelog } = createLogger();
    widelog.context(() => {
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
    const { widelog } = createLogger();

    await Promise.all([
      widelog.context(async () => {
        widelog.set("id", "first");
        widelog.count("n", 1);
        await new Promise((resolve) => setTimeout(resolve, 10));
        widelog.flush();
      }),
      widelog.context(async () => {
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
});
