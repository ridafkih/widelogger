import type { AgentConfig, AgentSessionConfig } from "./types";
import { AgentSession } from "./session";

export class AgentManager {
  private config: AgentConfig;
  private sessions: Map<string, AgentSession> = new Map();

  constructor(config: AgentConfig) {
    this.config = config;
  }

  createSession(config: AgentSessionConfig): AgentSession {
    if (this.sessions.has(config.sessionId)) {
      throw new Error(`Agent session already exists for session: ${config.sessionId}`);
    }

    const session = new AgentSession(config, this.config.opencodeUrl);
    this.sessions.set(config.sessionId, session);

    return session;
  }

  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.stop();
    this.sessions.delete(sessionId);
    return true;
  }

  listSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}
