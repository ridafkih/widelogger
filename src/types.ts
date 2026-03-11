export type FieldValue = string | number | boolean;

declare const KeyError: unique symbol;
interface KeyErrorBrand {
  [KeyError]: true;
}

type ValidateKey<T extends string> = T extends ""
  ? "widelog keys cannot be empty" & KeyErrorBrand
  : T extends `.${string}`
    ? "widelog keys cannot start with a dot" & KeyErrorBrand
    : T extends `${string}.`
      ? "widelog keys cannot end with a dot" & KeyErrorBrand
      : T extends `${string}..${string}`
        ? "widelog keys cannot contain empty segments" & KeyErrorBrand
        : T;

export type DottedKey<T extends string> = ValidateKey<T>;

export type Operation =
  | { operation: "set"; key: string; value: FieldValue }
  | { operation: "count"; key: string; amount: number }
  | { operation: "append"; key: string; value: FieldValue }
  | { operation: "max"; key: string; value: number }
  | { operation: "min"; key: string; value: number }
  | { operation: "time.start"; key: string; time: number }
  | { operation: "time.stop"; key: string; time: number };

export interface Context {
  operations: Operation[];
}
