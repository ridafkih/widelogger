import { AsyncLocalStorage } from "node:async_hooks";
import pino from "pino";
import { flush } from "./flush";
import type { Context, DottedKey, FieldValue, Operation } from "./types";

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
  slug?: string;
  retriable?: boolean;
  requiresReauth?: boolean;
}

interface StickyHandle {
  sticky: () => void;
}

interface ParsedErrorFields {
  error_name: string;
  error_message: string;
  error_stack?: string;
}

const isFieldValue = (value: unknown): value is FieldValue =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFieldValueArray = (value: unknown): value is FieldValue[] =>
  Array.isArray(value) && value.every(isFieldValue);

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

const extractErrorProperty = (error: unknown, property: string): unknown => {
  if (isRecord(error) && property in error) {
    return error[property];
  }
  return undefined;
};

const noop = () => undefined;
const noopSticky: StickyHandle = { sticky: noop };

const storage = new AsyncLocalStorage<Context>();

function pushOp(operation: Operation): StickyHandle {
  const store = storage.getStore();
  if (!store) {
    return noopSticky;
  }

  store.operations.push(operation);

  return {
    sticky: () => {
      const index = store.operations.indexOf(operation);
      if (index !== -1) {
        store.operations.splice(index, 1);
      }
      store.stickyOperations.push(operation);
    },
  };
}

function applyFields(
  operations: Operation[],
  fields: Record<string, unknown>,
  parentKey?: string
): void {
  for (const key of Object.keys(fields)) {
    const value = fields[key];
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (isFieldValue(value)) {
      operations.push({ operation: "set", key: fullKey, value });
      continue;
    }

    if (isFieldValueArray(value)) {
      for (const element of value) {
        operations.push({ operation: "append", key: fullKey, value: element });
      }
      continue;
    }

    if (isRecord(value)) {
      applyFields(operations, value, fullKey);
    }
  }
}

function measure<K extends string, T>(
  key: DottedKey<K>,
  callback: () => Promise<T>
): Promise<T>;
function measure<K extends string, T>(key: DottedKey<K>, callback: () => T): T;
function measure<K extends string, T>(
  key: DottedKey<K>,
  callback: () => T | Promise<T>
): T | Promise<T> {
  const operations = storage.getStore()?.operations;
  operations?.push({ operation: "time.start", key, time: performance.now() });

  let result: T | Promise<T>;
  try {
    result = callback();
  } catch (error) {
    operations?.push({ operation: "time.stop", key, time: performance.now() });
    throw error;
  }

  if (result instanceof Promise) {
    return result.finally(() => {
      operations?.push({
        operation: "time.stop",
        key,
        time: performance.now(),
      });
    });
  }

  operations?.push({ operation: "time.stop", key, time: performance.now() });
  return result;
}

export const widelog = {
  set: <K extends string>(
    key: DottedKey<K>,
    value: FieldValue
  ): StickyHandle => {
    return pushOp({ operation: "set", key, value });
  },
  setFields: (fields: Record<string, unknown>): StickyHandle => {
    const store = storage.getStore();
    if (!store) {
      return noopSticky;
    }

    const startIndex = store.operations.length;
    applyFields(store.operations, fields);

    return {
      sticky: () => {
        const added = store.operations.splice(startIndex);
        store.stickyOperations.push(...added);
      },
    };
  },
  count: <K extends string>(key: DottedKey<K>, amount = 1) => {
    pushOp({ operation: "count", key, amount });
  },
  append: <K extends string>(key: DottedKey<K>, value: FieldValue) => {
    pushOp({ operation: "append", key, value });
  },
  max: <K extends string>(key: DottedKey<K>, value: number) => {
    pushOp({ operation: "max", key, value });
  },
  min: <K extends string>(key: DottedKey<K>, value: number) => {
    pushOp({ operation: "min", key, value });
  },
  time: {
    start: <K extends string>(key: DottedKey<K>) => {
      pushOp({ operation: "time.start", key, time: performance.now() });
    },
    stop: <K extends string>(key: DottedKey<K>) => {
      pushOp({ operation: "time.stop", key, time: performance.now() });
    },
    measure,
  },
  errorFields: (error: unknown, options: ErrorFieldsOptions = {}) => {
    const context = storage.getStore();
    if (!context) {
      return;
    }

    const prefix = options.prefix ?? "error";
    const fields = getErrorFields(error, options.includeStack ?? true);

    context.operations.push(
      {
        operation: "set",
        key: `${prefix}.error_name`,
        value: fields.error_name,
      },
      {
        operation: "set",
        key: `${prefix}.error_message`,
        value: fields.error_message,
      }
    );

    if (fields.error_stack !== undefined) {
      context.operations.push({
        operation: "set",
        key: `${prefix}.error_stack`,
        value: fields.error_stack,
      });
    }

    const slug = options.slug ?? extractErrorProperty(error, "slug");
    if (typeof slug === "string") {
      context.operations.push({
        operation: "set",
        key: `${prefix}.slug`,
        value: slug,
      });
    }

    const retriable =
      options.retriable ?? extractErrorProperty(error, "retriable");
    if (typeof retriable === "boolean") {
      context.operations.push({
        operation: "set",
        key: `${prefix}.retriable`,
        value: retriable,
      });
    }

    const requiresReauth =
      options.requiresReauth ?? extractErrorProperty(error, "requiresReauth");
    if (typeof requiresReauth === "boolean") {
      context.operations.push({
        operation: "set",
        key: `${prefix}.requires_reauth`,
        value: requiresReauth,
      });
    }
  },
  flush: () => {
    const store = storage.getStore();
    if (!store) {
      return;
    }

    if (store.operations.length === 0 && store.stickyOperations.length === 0) {
      return;
    }

    const event = flush(store);
    store.transport(event);
  },
};

export const widelogger = (options: WideloggerOptions) => {
  const nodeEnvironment =
    typeof process.env === "object" ? process.env.NODE_ENV : undefined;
  const environment = options.environment ?? nodeEnvironment ?? "development";
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

  const defaultEventName = options.defaultEventName;

  const transport = (event: Record<string, unknown>) => {
    const statusCode =
      typeof event.status_code === "number" ? event.status_code : undefined;
    const isError =
      statusCode !== undefined ? statusCode >= 500 : event.outcome === "error";

    event.event_name = defaultEventName;

    if (isError) {
      logger.error(event);
      return;
    }

    logger.info(event);
  };

  const clearContext = () => {
    const context = storage.getStore();
    if (context) {
      context.operations = [];
      context.stickyOperations = [];
    }
  };

  function context<T>(callback: () => Promise<T>): Promise<T>;
  function context<T>(callback: () => T): T;
  function context<T>(callback: () => T | Promise<T>): T | Promise<T> {
    return storage.run(
      { operations: [], stickyOperations: [], transport },
      () => {
        let result: T | Promise<T>;
        try {
          result = callback();
        } catch (error) {
          clearContext();
          throw error;
        }

        if (result instanceof Promise) {
          return result.finally(clearContext);
        }

        clearContext();
        return result;
      }
    );
  }

  const destroy = async () => {
    await new Promise<void>((resolve) => {
      logger.flush(() => resolve());
    });

    if (pinoTransport && typeof pinoTransport.end === "function") {
      pinoTransport.end();
    }
  };

  return { context, destroy };
};

export type Widelog = typeof widelog;
