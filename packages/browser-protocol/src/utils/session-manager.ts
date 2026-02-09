import type { SessionManager } from "../types/orchestrator";

export type { SessionManager } from "../types/orchestrator";

interface LocalSessionState {
  subscriberCount: number;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  lastFrame: string | null;
  lastFrameTime: number | null;
}

export const createSessionManager = (): SessionManager => {
  const sessions = new Map<string, LocalSessionState>();

  const getOrCreate = (sessionId: string): LocalSessionState => {
    const existing = sessions.get(sessionId);
    if (existing) {
      return existing;
    }

    const state: LocalSessionState = {
      subscriberCount: 0,
      cleanupTimer: null,
      lastFrame: null,
      lastFrameTime: null,
    };
    sessions.set(sessionId, state);
    return state;
  };

  return {
    getSubscriberCount: (sessionId) =>
      sessions.get(sessionId)?.subscriberCount ?? 0,

    incrementSubscribers: (sessionId) => {
      const state = getOrCreate(sessionId);
      state.subscriberCount += 1;
      return state.subscriberCount;
    },

    decrementSubscribers: (sessionId) => {
      const state = getOrCreate(sessionId);
      state.subscriberCount = Math.max(0, state.subscriberCount - 1);
      return state.subscriberCount;
    },

    setCleanupTimer: (sessionId, callback, delayMs) => {
      const state = getOrCreate(sessionId);
      if (state.cleanupTimer) {
        clearTimeout(state.cleanupTimer);
      }
      state.cleanupTimer = setTimeout(callback, delayMs);
    },

    clearCleanupTimer: (sessionId) => {
      const state = sessions.get(sessionId);
      if (state?.cleanupTimer) {
        clearTimeout(state.cleanupTimer);
        state.cleanupTimer = null;
      }
    },

    resetSession: (sessionId) => {
      const state = sessions.get(sessionId);
      if (state) {
        state.cleanupTimer = null;
        state.lastFrame = null;
        state.lastFrameTime = null;
      }
    },

    delete: (sessionId) => {
      const state = sessions.get(sessionId);
      if (state?.cleanupTimer) {
        clearTimeout(state.cleanupTimer);
      }
      sessions.delete(sessionId);
    },

    getFrame: (sessionId) => sessions.get(sessionId)?.lastFrame ?? null,

    setFrame: (sessionId, frame) => {
      const state = getOrCreate(sessionId);
      state.lastFrame = frame;
      state.lastFrameTime = Date.now();
    },
  };
};
