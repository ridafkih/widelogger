function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`${key} environment variable is required`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value;
}

function getOptionalEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`${key} must be a valid integer`);
  }
  return parsed;
}

function getOptionalEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value.toLowerCase() === "true" || value === "1";
}

function getOptionalEnvList(key: string): string[] {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return [];
  }
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  port: getOptionalEnvInt("PORT", 3040),
  apiUrl: getRequiredEnv("API_URL"),
  apiWsUrl: getRequiredEnv("API_WS_URL"),
  databaseUrl: getRequiredEnv("DATABASE_URL"),

  imessageEnabled: getOptionalEnvBool("IMESSAGE_ENABLED", true),
  imessageWatchedContacts: getOptionalEnvList("IMESSAGE_WATCHED_CONTACTS"),
  imessageContextMessages: getOptionalEnvInt("IMESSAGE_CONTEXT_MESSAGES", 20),

  staleSessionThresholdMs: getOptionalEnvInt("STALE_SESSION_THRESHOLD_MS", 86400000),
};

export type Config = typeof config;
