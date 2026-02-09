export const VALID_CONTAINER_STATES = [
  "created",
  "running",
  "paused",
  "restarting",
  "removing",
  "exited",
  "dead",
] as const;

export const DEFAULT_PORT_RANGE = { min: 32_768, max: 60_999 } as const;
export const DEFAULT_STOP_TIMEOUT = 10;
export const DEFAULT_PROTOCOL = "tcp" as const;
