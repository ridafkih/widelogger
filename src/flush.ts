import type { Context, ErrorParser, FieldValue } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const setNested = (
  target: Record<string, unknown>,
  key: string,
  value: unknown
) => {
  const parts = key.split(".");
  if (parts.length === 1) {
    target[key] = value;
    return;
  }

  const lastIndex = parts.length - 1;
  let current = target;

  for (let i = 0; i < lastIndex; i++) {
    const part = parts[i] ?? "";
    const existing = current[part];
    if (isRecord(existing)) {
      current = existing;
    } else {
      const next: Record<string, unknown> = Object.create(null);
      current[part] = next;
      current = next;
    }
  }

  const lastPart = parts[lastIndex] ?? "";
  current[lastPart] = value;
};

interface ErrorAggregation {
  slugs: string[];
  counts: Record<string, number>;
  total: number;
}

interface Aggregators {
  event: Record<string, unknown>;
  counters: Record<string, number>;
  arrays: Record<string, FieldValue[]>;
  maxValues: Record<string, number>;
  minValues: Record<string, number>;
  timers: Record<string, { start: number; accumulated: number }>;
  errors: Record<string, ErrorAggregation>;
}

const createAggregators = (): Aggregators => ({
  event: Object.create(null),
  counters: Object.create(null),
  arrays: Object.create(null),
  maxValues: Object.create(null),
  minValues: Object.create(null),
  timers: Object.create(null),
  errors: Object.create(null),
});

const aggregateError = (agg: Aggregators, key: string, slug: string): void => {
  const existing = agg.errors[key];
  if (existing) {
    existing.total += 1;
    const previousCount = existing.counts[slug];
    if (typeof previousCount === "number") {
      existing.counts[slug] = previousCount + 1;
    } else {
      existing.counts[slug] = 1;
      existing.slugs.push(slug);
    }
  } else {
    agg.errors[key] = {
      slugs: [slug],
      counts: { [slug]: 1 },
      total: 1,
    };
  }
};

const processOperation = (
  agg: Aggregators,
  entry: Context["operations"][number],
  errorParser: ErrorParser | null
): void => {
  switch (entry.operation) {
    case "set":
      setNested(agg.event, entry.key, entry.value);
      break;
    case "count":
      agg.counters[entry.key] = (agg.counters[entry.key] ?? 0) + entry.amount;
      break;
    case "append": {
      const existing = agg.arrays[entry.key];
      if (existing) {
        existing.push(entry.value);
      } else {
        agg.arrays[entry.key] = [entry.value];
      }
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
      const existingTimer = agg.timers[entry.key];
      if (existingTimer) {
        existingTimer.start = entry.time;
      } else {
        agg.timers[entry.key] = { start: entry.time, accumulated: 0 };
      }
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
    case "error": {
      if (errorParser) {
        const slug = errorParser(entry.error);
        aggregateError(agg, entry.key, slug);
      }
      break;
    }

    default:
  }
};

const mergeAggregators = (agg: Aggregators): void => {
  const sources: Record<string, unknown>[] = [
    agg.counters,
    agg.arrays,
    agg.maxValues,
    agg.minValues,
    agg.errors,
  ];

  for (const source of sources) {
    for (const key of Object.keys(source)) {
      setNested(agg.event, key, source[key]);
    }
  }

  for (const [key, timer] of Object.entries(agg.timers)) {
    setNested(agg.event, key, Math.round(timer.accumulated * 100) / 100);
  }
};

export const flush = (
  context: Context | undefined
): Record<string, unknown> => {
  if (!context) {
    return {};
  }

  const hasStickyOperations = context.stickyOperations.length > 0;
  const hasOperations = context.operations.length > 0;

  if (!(hasStickyOperations || hasOperations)) {
    return {};
  }

  const agg = createAggregators();

  for (const entry of context.stickyOperations) {
    processOperation(agg, entry, context.errorParser);
  }

  for (const entry of context.operations) {
    processOperation(agg, entry, context.errorParser);
  }

  mergeAggregators(agg);

  context.operations = [];
  return agg.event;
};
