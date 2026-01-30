import {
  isDaemonRunning as agentIsDaemonRunning,
  getPidFile,
  cleanupSocket,
  getSocketDir,
  getStreamPortFile,
} from "agent-browser";
import { readFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Subprocess } from "bun";

export interface DaemonSession {
  sessionId: string;
  port: number;
  ready: boolean;
}

export interface StartResult {
  type: "started" | "already_running";
  sessionId: string;
  port: number;
  ready: boolean;
}

export interface StopResult {
  type: "stopped" | "not_found";
  sessionId: string;
}

export interface DaemonManagerConfig {
  baseStreamPort: number;
  profileDir?: string;
}

export interface DaemonManager {
  start(sessionId: string): Promise<StartResult>;
  stop(sessionId: string): StopResult;
  getSession(sessionId: string): DaemonSession | null;
  getOrRecoverSession(sessionId: string): DaemonSession | null;
  getAllSessions(): DaemonSession[];
  isRunning(sessionId: string): boolean;
  isReady(sessionId: string): boolean;
}

export function createDaemonManager(config: DaemonManagerConfig): DaemonManager {
  const activeSessions = new Map<string, number>(); // sessionId -> port
  const daemonProcesses = new Map<string, Subprocess>();
  let nextStreamPort = config.baseStreamPort + 1;

  const allocatePort = (): number => nextStreamPort++;

  const recoverSession = (sessionId: string): DaemonSession | null => {
    try {
      const streamPortPath = getStreamPortFile(sessionId);
      if (!existsSync(streamPortPath)) {
        console.debug(`[DaemonManager] Cannot recover ${sessionId}: no stream port file`);
        return null;
      }

      const port = parseInt(readFileSync(streamPortPath, "utf-8").trim(), 10);
      if (isNaN(port)) {
        console.debug(`[DaemonManager] Cannot recover ${sessionId}: invalid port in file`);
        return null;
      }

      if (!agentIsDaemonRunning(sessionId)) {
        console.debug(`[DaemonManager] Cannot recover ${sessionId}: daemon not running`);
        cleanupSocket(sessionId);
        return null;
      }

      activeSessions.set(sessionId, port);
      if (port >= nextStreamPort) {
        nextStreamPort = port + 1;
      }

      console.log(`[DaemonManager] Recovered: ${sessionId} on port ${port}`);
      return { sessionId, port, ready: agentIsDaemonRunning(sessionId) };
    } catch (error) {
      console.warn(`[DaemonManager] Failed to recover ${sessionId}:`, error);
      return null;
    }
  };

  const initializeFromExistingDaemons = (): void => {
    const socketDir = getSocketDir();
    if (!existsSync(socketDir)) return;

    const files = readdirSync(socketDir);
    const streamFiles = files.filter((file) => file.endsWith(".stream"));

    for (const streamFile of streamFiles) {
      const sessionId = streamFile.replace(".stream", "");
      if (sessionId === "default") continue;
      recoverSession(sessionId);
    }
  };

  const killDaemonProcess = (sessionId: string): boolean => {
    const subprocess = daemonProcesses.get(sessionId);
    if (subprocess) {
      try {
        subprocess.kill("SIGTERM");
        daemonProcesses.delete(sessionId);
        cleanupSocket(sessionId);
        return true;
      } catch (error) {
        console.warn(`[DaemonManager] Failed to kill subprocess for ${sessionId}:`, error);
        daemonProcesses.delete(sessionId);
      }
    }

    try {
      const pidFile = getPidFile(sessionId);
      if (!existsSync(pidFile)) return false;

      const pid = parseInt(readFileSync(pidFile, "utf-8").trim(), 10);
      if (isNaN(pid)) return false;

      process.kill(pid, "SIGTERM");
      cleanupSocket(sessionId);
      return true;
    } catch (error) {
      console.warn(`[DaemonManager] Failed to kill process for ${sessionId}:`, error);
      return false;
    }
  };

  // Initialize on creation
  initializeFromExistingDaemons();

  return {
    async start(sessionId: string): Promise<StartResult> {
      const existingPort = activeSessions.get(sessionId);
      if (existingPort !== undefined) {
        return { type: "already_running", sessionId, port: existingPort, ready: agentIsDaemonRunning(sessionId) };
      }

      const port = allocatePort();
      activeSessions.set(sessionId, port);

      const daemonPath = require.resolve("agent-browser/dist/daemon.js");

      const env: Record<string, string> = {
        ...process.env,
        AGENT_BROWSER_DAEMON: "1",
        AGENT_BROWSER_SESSION: sessionId,
        AGENT_BROWSER_STREAM_PORT: String(port),
        AGENT_BROWSER_SOCKET_DIR: getSocketDir(),
      } as Record<string, string>;

      if (config.profileDir) {
        const profilePath = join(config.profileDir, sessionId);
        if (!existsSync(profilePath)) {
          mkdirSync(profilePath, { recursive: true });
        }
        env.AGENT_BROWSER_PROFILE = profilePath;
      }

      const subprocess = Bun.spawn(["bun", "run", daemonPath], {
        env,
        stdio: ["ignore", "inherit", "inherit"],
      });

      daemonProcesses.set(sessionId, subprocess);

      subprocess.exited.then((exitCode) => {
        console.log(`[DaemonManager] Exited: ${sessionId} (code ${exitCode})`);
        daemonProcesses.delete(sessionId);
        activeSessions.delete(sessionId);
      });

      console.log(`[DaemonManager] Starting: ${sessionId} on port ${port}`);
      return { type: "started", sessionId, port, ready: false };
    },

    stop(sessionId: string): StopResult {
      const wasTracked = activeSessions.has(sessionId);
      const killed = killDaemonProcess(sessionId);
      activeSessions.delete(sessionId);

      if (!wasTracked && !killed) {
        return { type: "not_found", sessionId };
      }

      console.log(`[DaemonManager] Stopped: ${sessionId}`);
      return { type: "stopped", sessionId };
    },

    getSession(sessionId: string): DaemonSession | null {
      const port = activeSessions.get(sessionId);
      if (port === undefined) return null;
      return { sessionId, port, ready: agentIsDaemonRunning(sessionId) };
    },

    getOrRecoverSession(sessionId: string): DaemonSession | null {
      return this.getSession(sessionId) ?? recoverSession(sessionId);
    },

    getAllSessions(): DaemonSession[] {
      return [...activeSessions.entries()].map(([sessionId, port]) => ({
        sessionId,
        port,
        ready: agentIsDaemonRunning(sessionId),
      }));
    },

    isRunning(sessionId: string): boolean {
      return activeSessions.has(sessionId) && agentIsDaemonRunning(sessionId);
    },

    isReady(sessionId: string): boolean {
      return activeSessions.has(sessionId) && agentIsDaemonRunning(sessionId);
    },
  };
}
