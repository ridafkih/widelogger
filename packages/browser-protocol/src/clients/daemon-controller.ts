import { BrowserError } from "../types/error";
import type {
  BrowserCommand,
  CommandResult,
  DaemonController,
} from "../types/orchestrator";
import { StatusResponse, UrlResponse } from "../types/responses";
import type { DaemonStatus } from "../types/session";

export { executeCommand } from "../utils/execute-command";

export interface DaemonControllerConfig {
  baseUrl: string;
}

export const createDaemonController = (
  config: DaemonControllerConfig
): DaemonController => {
  const { baseUrl } = config;

  const start = async (
    sessionId: string,
    url?: string
  ): Promise<{ port: number }> => {
    const response = await fetch(`${baseUrl}/daemons/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw BrowserError.daemonStartFailed(
        sessionId,
        `HTTP ${response.status}: ${body}`
      );
    }

    const data = await response.json();
    return { port: data.port };
  };

  const stop = async (sessionId: string): Promise<void> => {
    const response = await fetch(`${baseUrl}/daemons/${sessionId}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 404) {
      const body = await response.text();
      throw BrowserError.daemonStopFailed(
        sessionId,
        `HTTP ${response.status}: ${body}`
      );
    }
  };

  const navigate = async (sessionId: string, url: string): Promise<void> => {
    const response = await fetch(`${baseUrl}/daemons/${sessionId}/navigate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw BrowserError.navigationFailed(
        sessionId,
        url,
        `HTTP ${response.status}: ${body}`
      );
    }
  };

  const getStatus = async (sessionId: string): Promise<DaemonStatus | null> => {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/daemons/${sessionId}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      throw BrowserError.connectionFailed(sessionId, message);
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await response.text();
      throw BrowserError.connectionFailed(
        sessionId,
        `HTTP ${response.status}: ${body}`
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown parse error";
      throw BrowserError.connectionFailed(
        sessionId,
        `Invalid JSON response: ${message}`
      );
    }

    const parsed = StatusResponse.safeParse(data);
    if (!parsed.success) {
      throw BrowserError.connectionFailed(
        sessionId,
        `Invalid status response: ${parsed.error.message}`
      );
    }

    return {
      running: parsed.data.running,
      ready: parsed.data.ready,
      port: parsed.data.port,
    };
  };

  const getCurrentUrl = async (sessionId: string): Promise<string | null> => {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/daemons/${sessionId}/url`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      throw BrowserError.connectionFailed(sessionId, message);
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await response.text();
      throw BrowserError.connectionFailed(
        sessionId,
        `HTTP ${response.status}: ${body}`
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown parse error";
      throw BrowserError.connectionFailed(
        sessionId,
        `Invalid JSON response: ${message}`
      );
    }

    const parsed = UrlResponse.safeParse(data);
    if (!parsed.success) {
      throw BrowserError.connectionFailed(
        sessionId,
        `Invalid URL response: ${parsed.error.message}`
      );
    }

    return parsed.data.url;
  };

  const launch = async (sessionId: string): Promise<void> => {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/daemons/${sessionId}/launch`, {
        method: "POST",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      throw BrowserError.connectionFailed(sessionId, message);
    }

    if (!response.ok) {
      const body = await response.text();
      throw BrowserError.connectionFailed(
        sessionId,
        `HTTP ${response.status}: ${body}`
      );
    }
  };

  const isHealthy = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.debug("[DaemonController] Health check failed:", error);
      return false;
    }
  };

  const executeCommand = async <T = unknown>(
    sessionId: string,
    command: BrowserCommand
  ): Promise<CommandResult<T>> => {
    const { executeCommand: exec } = await import("../utils/execute-command");
    return exec<T>(baseUrl, sessionId, command);
  };

  return {
    start,
    stop,
    navigate,
    getStatus,
    getCurrentUrl,
    launch,
    isHealthy,
    executeCommand,
  };
};
