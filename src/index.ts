import { AsyncLocalStorage } from "node:async_hooks";
import pino from "pino";
import { flush } from "./flush";
import type { Context, DottedKey, FieldValue } from "./types";

export interface WideloggerOptions {
  service: string;
  defaultEventName: string;
  version?: string;
  commitHash?: string;
  instanceId?: string;
  environment?: string;
  level?: string;
}

export interface ErrorFieldsOptions {
  prefix?: string;
  includeStack?: boolean;
}

interface ParsedErrorFields {
  error_name: string;
  error_message: string;
  error_stack?: string;
}

function getErrorFields(
  error: unknown,
  includeStack = true
): ParsedErrorFields {
  if (error instanceof Error) {
    return {
      error_name: error.name,
      error_message: error.message,
      error_stack: includeStack ? error.stack : undefined,
    };
  }

  if (typeof error === "string") {
    return {
      error_name: "Error",
      error_message: error,
    };
  }

  return {
    error_name: "UnknownError",
    error_message: "Unknown error",
  };
}

export const widelogger = (options: WideloggerOptions) => {
  const environment =
    options.environment ?? process.env.NODE_ENV ?? "development";
  const isDevelopment = environment !== "production";

  const pinoTransport = isDevelopment
    ? pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      })
    : undefined;

  const logger = pino(
    {
      level: options.level ?? process.env.LOG_LEVEL ?? "info",
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        service: options.service,
        service_version: options.version,
        commit_hash: options.commitHash ?? "unknown",
        instance_id: options.instanceId ?? String(process.pid),
        environment,
      },
    },
    pinoTransport
  );

  const storage = new AsyncLocalStorage<Context>();

  const transport = (event: Record<string, unknown>) => {
    if (Object.keys(event).length === 0) {
      return;
    }

    const statusCode =
      typeof event.status_code === "number" ? event.status_code : undefined;
    const isError =
      statusCode !== undefined ? statusCode >= 500 : event.outcome === "error";
    const payload = { event_name: options.defaultEventName, ...event };

    if (isError) {
      logger.error(payload);
      return;
    }

    logger.info(payload);
  };

  const getContext = (): Context | undefined => storage.getStore();

  function runContext<T>(callback: () => Promise<T>): Promise<T>;
  function runContext<T>(callback: () => T): T;
  function runContext<T>(callback: () => T | Promise<T>): T | Promise<T> {
    return storage.run({ operations: [] }, callback);
  }

  const widelog = {
    set: <K extends string>(key: DottedKey<K>, value: FieldValue) => {
      getContext()?.operations.push({ operation: "set", key, value });
    },
    count: <K extends string>(key: DottedKey<K>, amount = 1) => {
      getContext()?.operations.push({ operation: "count", key, amount });
    },
    append: <K extends string>(key: DottedKey<K>, value: FieldValue) => {
      getContext()?.operations.push({ operation: "append", key, value });
    },
    max: <K extends string>(key: DottedKey<K>, value: number) => {
      getContext()?.operations.push({ operation: "max", key, value });
    },
    min: <K extends string>(key: DottedKey<K>, value: number) => {
      getContext()?.operations.push({ operation: "min", key, value });
    },
    time: {
      start: <K extends string>(key: DottedKey<K>) => {
        getContext()?.operations.push({
          operation: "time.start",
          key,
          time: performance.now(),
        });
      },
      stop: <K extends string>(key: DottedKey<K>) => {
        getContext()?.operations.push({
          operation: "time.stop",
          key,
          time: performance.now(),
        });
      },
    },
    errorFields: (error: unknown, options: ErrorFieldsOptions = {}) => {
      const context = getContext();
      if (!context) {
        return;
      }

      const prefix = options.prefix ?? "error";
      const fields = getErrorFields(error, options.includeStack ?? true);

      for (const [field, value] of Object.entries(fields)) {
        if (typeof value === "undefined") {
          continue;
        }
        context.operations.push({
          operation: "set",
          key: `${prefix}.${field}`,
          value,
        });
      }
    },
    flush: () => {
      const event = flush(getContext());
      transport(event);
    },
    context: runContext,
  };

  return { widelog };
};

export type Widelog = ReturnType<typeof widelogger>["widelog"];
