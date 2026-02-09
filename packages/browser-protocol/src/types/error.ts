import { z } from "zod";

export const BrowserErrorKind = z.enum([
  "DaemonNotFound",
  "DaemonStartFailed",
  "DaemonStopFailed",
  "ConnectionFailed",
  "NavigationFailed",
  "StateTransitionInvalid",
  "SessionNotFound",
  "ValidationFailed",
  "Timeout",
]);
export type BrowserErrorKind = z.infer<typeof BrowserErrorKind>;

export class BrowserError extends Error {
  constructor(
    public readonly kind: BrowserErrorKind,
    message: string,
    public readonly sessionId?: string
  ) {
    super(message);
    this.name = "BrowserError";
  }

  static daemonNotFound(sessionId: string) {
    return new BrowserError(
      "DaemonNotFound",
      `Daemon not found for session ${sessionId}`,
      sessionId
    );
  }

  static daemonStartFailed(sessionId: string, reason: string) {
    return new BrowserError("DaemonStartFailed", reason, sessionId);
  }

  static daemonStopFailed(sessionId: string, reason: string) {
    return new BrowserError("DaemonStopFailed", reason, sessionId);
  }

  static connectionFailed(sessionId: string, reason: string) {
    return new BrowserError("ConnectionFailed", reason, sessionId);
  }

  static navigationFailed(sessionId: string, url: string, reason: string) {
    return new BrowserError(
      "NavigationFailed",
      `Failed to navigate to ${url}: ${reason}`,
      sessionId
    );
  }

  static stateTransitionInvalid(sessionId: string, from: string, to: string) {
    return new BrowserError(
      "StateTransitionInvalid",
      `Invalid transition from ${from} to ${to}`,
      sessionId
    );
  }

  static sessionNotFound(sessionId: string) {
    return new BrowserError(
      "SessionNotFound",
      `Session ${sessionId} not found`,
      sessionId
    );
  }

  static validationFailed(message: string, sessionId?: string) {
    return new BrowserError("ValidationFailed", message, sessionId);
  }

  static timeout(sessionId: string, operation: string) {
    return new BrowserError("Timeout", `${operation} timed out`, sessionId);
  }
}
