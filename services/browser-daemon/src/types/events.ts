export type DaemonEventType =
  | "daemon:started"
  | "daemon:ready"
  | "daemon:stopped"
  | "daemon:error";

interface DaemonEventData {
  port?: number;
  cdpPort?: number;
  exitCode?: number;
  error?: string;
}

export interface DaemonEvent {
  type: DaemonEventType;
  sessionId: string;
  timestamp: number;
  data?: DaemonEventData;
}

export type DaemonEventHandler = (event: DaemonEvent) => void;
