import type { Context, FieldValue } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const setNested = (
  target: Record<string, unknown>,
  key: string,
  value: unknown
) => {
  if (!key.includes(".")) {
    target[key] = value;
    return;
  }

  const parts = key.split(".");
  const lastPart = parts.pop();
  if (lastPart === undefined) {
    return;
  }

  let current = target;

  for (const part of parts) {
    const existing = current[part];
    if (Object.hasOwn(current, part) && isRecord(existing)) {
      current = existing;
    } else {
      const next: Record<string, unknown> = Object.create(null);
      current[part] = next;
      current = next;
    }
  }

  current[lastPart] = value;
};

interface Aggregators {
  event: Record<string, unknown>;
  counters: Record<string, number>;
  arrays: Record<string, FieldValue[]>;
  maxValues: Record<string, number>;
  minValues: Record<string, number>;
  timers: Record<string, { start: number; accumulated: number }>;
}

const createAggregators = (): Aggregators => ({
  event: Object.create(null),
  counters: Object.create(null),
  arrays: Object.create(null),
  maxValues: Object.create(null),
  minValues: Object.create(null),
  timers: Object.create(null),
});

const processOperation = (
  agg: Aggregators,
  entry: Context["operations"][number]
): void => {
  switch (entry.operation) {
    case "set":
      setNested(agg.event, entry.key, entry.value);
      break;
    case "count":
      agg.counters[entry.key] = (agg.counters[entry.key] ?? 0) + entry.amount;
      break;
    case "append": {
      const existing = agg.arrays[entry.key] ?? [];
      existing.push(entry.value);
      agg.arrays[entry.key] = existing;
      break;
    }
    case "max": {
      const current = agg.maxValues[entry.key];
      if (current === undefined || entry.value > current) {
        agg.maxValues[entry.key] = entry.value;
      }
      break;
    }
    case "min": {
      const current = agg.minValues[entry.key];
      if (current === undefined || entry.value < current) {
        agg.minValues[entry.key] = entry.value;
      }
      break;
    }
    case "time.start": {
      const existing = agg.timers[entry.key] ?? { start: 0, accumulated: 0 };
      existing.start = entry.time;
      agg.timers[entry.key] = existing;
      break;
    }
    case "time.stop": {
      const timer = agg.timers[entry.key];
      if (timer && timer.start > 0) {
        timer.accumulated += entry.time - timer.start;
        timer.start = 0;
      }
      break;
    }

    default:
      break;
  }
};

const mergeAggregators = (agg: Aggregators): void => {
  for (const key of Object.keys(agg.counters)) {
    setNested(agg.event, key, agg.counters[key]);
  }
  for (const key of Object.keys(agg.arrays)) {
    setNested(agg.event, key, agg.arrays[key]);
  }
  for (const key of Object.keys(agg.maxValues)) {
    setNested(agg.event, key, agg.maxValues[key]);
  }
  for (const key of Object.keys(agg.minValues)) {
    setNested(agg.event, key, agg.minValues[key]);
  }
  for (const key of Object.keys(agg.timers)) {
    const timer = agg.timers[key];
    if (timer) {
      setNested(agg.event, key, Math.round(timer.accumulated * 100) / 100);
    }
  }
};

export const flush = (
  context: Context | undefined
): Record<string, unknown> => {
  if (!context) {
    return {};
  }

  const agg = createAggregators();

  for (const entry of context.operations) {
    processOperation(agg, entry);
  }

  mergeAggregators(agg);

  context.operations.length = 0;
  return agg.event;
};
