import { BrowserError } from "../types/error";
import type { StateStore, StateStoreOptions } from "../types/orchestrator";
import {
  type BrowserSessionState,
  BrowserSessionState as BrowserSessionStateSchema,
  type CurrentState,
  type DesiredState,
} from "../types/session";

export type { StateStore, StateStoreOptions } from "../types/orchestrator";

export const createInMemoryStateStore = (): StateStore => {
  const sessions = new Map<string, BrowserSessionState>();

  const getState = async (
    sessionId: string
  ): Promise<BrowserSessionState | null> => {
    return sessions.get(sessionId) ?? null;
  };

  const setState = async (state: BrowserSessionState): Promise<void> => {
    const parsed = BrowserSessionStateSchema.safeParse(state);
    if (!parsed.success) {
      throw BrowserError.validationFailed(
        parsed.error.message,
        state.sessionId
      );
    }
    sessions.set(state.sessionId, parsed.data);
  };

  const setDesiredState = async (
    sessionId: string,
    desiredState: DesiredState
  ): Promise<BrowserSessionState> => {
    const existing = sessions.get(sessionId);
    const now = new Date();

    const state: BrowserSessionState = existing
      ? { ...existing, desiredState, updatedAt: now }
      : {
          sessionId,
          desiredState,
          currentState: "stopped",
          streamPort: null,
          lastUrl: null,
          errorMessage: null,
          retryCount: 0,
          lastHeartbeat: null,
          createdAt: now,
          updatedAt: now,
        };

    sessions.set(sessionId, state);
    return state;
  };

  const setCurrentState = async (
    sessionId: string,
    currentState: CurrentState,
    options: StateStoreOptions = {}
  ): Promise<BrowserSessionState> => {
    const existing = sessions.get(sessionId);
    if (!existing) {
      throw BrowserError.sessionNotFound(sessionId);
    }

    const now = new Date();
    const state: BrowserSessionState = {
      ...existing,
      currentState,
      updatedAt: now,
      ...(options.streamPort !== undefined && {
        streamPort: options.streamPort,
      }),
      ...(options.errorMessage !== undefined && {
        errorMessage: options.errorMessage,
      }),
      ...(options.retryCount !== undefined && {
        retryCount: options.retryCount,
      }),
      ...(options.lastUrl !== undefined && { lastUrl: options.lastUrl }),
    };

    sessions.set(sessionId, state);
    return state;
  };

  const transitionState = async (
    sessionId: string,
    transition: (current: BrowserSessionState) => BrowserSessionState
  ): Promise<BrowserSessionState> => {
    const existing = sessions.get(sessionId);
    if (!existing) {
      throw BrowserError.sessionNotFound(sessionId);
    }

    const newState = transition(existing);
    const parsed = BrowserSessionStateSchema.safeParse(newState);
    if (!parsed.success) {
      throw BrowserError.validationFailed(parsed.error.message, sessionId);
    }

    sessions.set(sessionId, parsed.data);
    return parsed.data;
  };

  const getAllSessions = async (): Promise<BrowserSessionState[]> => {
    return Array.from(sessions.values());
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    sessions.delete(sessionId);
  };

  const updateHeartbeat = async (sessionId: string): Promise<void> => {
    const existing = sessions.get(sessionId);
    if (!existing) {
      throw BrowserError.sessionNotFound(sessionId);
    }

    sessions.set(sessionId, {
      ...existing,
      lastHeartbeat: new Date(),
      updatedAt: new Date(),
    });
  };

  const setLastUrl = async (
    sessionId: string,
    url: string | null
  ): Promise<void> => {
    const existing = sessions.get(sessionId);
    if (!existing) {
      throw BrowserError.sessionNotFound(sessionId);
    }

    sessions.set(sessionId, {
      ...existing,
      lastUrl: url,
      updatedAt: new Date(),
    });
  };

  return {
    getState,
    setState,
    setDesiredState,
    setCurrentState,
    transitionState,
    getAllSessions,
    deleteSession,
    updateHeartbeat,
    setLastUrl,
  };
};
