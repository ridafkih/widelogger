/**
 * Environment variable utilities for consistent configuration parsing across services.
 */

/**
 * Gets a required environment variable.
 * Throws an error if the variable is not set or is empty.
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`${key} environment variable is required`);
  }
  return value;
}

/**
 * Gets an optional environment variable.
 * Returns the default value if the variable is not set or is empty.
 */
export function getOptionalEnv(
  key: string,
  defaultValue?: string
): string | undefined {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value;
}

/**
 * Gets an optional environment variable as an integer.
 * Returns the default value if the variable is not set or is empty.
 * Throws an error if the value is not a valid integer.
 */
export function getOptionalEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${key} must be a valid integer`);
  }
  return parsed;
}

/**
 * Gets an optional environment variable as a boolean.
 * Returns true if the value is "true" or "1" (case-insensitive).
 * Returns the default value if the variable is not set or is empty.
 */
export function getOptionalEnvBool(
  key: string,
  defaultValue: boolean
): boolean {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Gets an optional environment variable as a list.
 * Splits the value by commas and trims whitespace.
 * Returns an empty array if the variable is not set or is empty.
 */
export function getOptionalEnvList(
  key: string,
  defaultValue: string[] = []
): string[] {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Gets an optional environment variable as a float.
 * Returns the default value if the variable is not set or is empty.
 * Throws an error if the value is not a valid number.
 */
export function getOptionalEnvFloat(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${key} must be a valid number`);
  }
  return parsed;
}
