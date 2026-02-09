export interface DaemonSession {
  sessionId: string;
  port: number;
  cdpPort: number;
  ready: boolean;
}

export interface StartResult {
  type: "started" | "already_running";
  sessionId: string;
  port: number;
  cdpPort: number;
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
  navigate(sessionId: string, url: string): boolean;
  executeCommand(
    sessionId: string,
    command: import("agent-browser/dist/types.js").Command
  ): Promise<import("agent-browser/dist/types.js").Response>;
  getCurrentUrl(sessionId: string): string | null;
  onEvent(handler: import("./events").DaemonEventHandler): () => void;
}
