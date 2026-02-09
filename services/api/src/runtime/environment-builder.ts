import { VOLUMES } from "../config/constants";

export function buildEnvironmentVariables(
  sessionId: string,
  envVars: { key: string; value: string }[]
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const envVar of envVars) {
    env[envVar.key] = envVar.value;
  }
  env.AGENT_BROWSER_SOCKET_DIR = VOLUMES.BROWSER_SOCKET_DIR;
  env.AGENT_BROWSER_SESSION = sessionId;

  return env;
}
