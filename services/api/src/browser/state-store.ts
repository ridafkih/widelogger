import { db } from "@lab/database/client";
import { browserSessions } from "@lab/database/schema/browser-sessions";
import { sessions } from "@lab/database/schema/sessions";
import { eq, isNull, inArray } from "drizzle-orm";
import {
  type StateStoreOptions,
  BrowserSessionState,
  DesiredState,
  CurrentState,
  BrowserError,
} from "@lab/browser-protocol";
import { widelog } from "../logging";

const mapDbToState = (session: typeof browserSessions.$inferSelect): BrowserSessionState => ({
  sessionId: session.sessionId,
  desiredState: DesiredState.parse(session.desiredState),
  currentState: CurrentState.parse(session.currentState),
  streamPort: session.streamPort,
  lastUrl: session.lastUrl,
  errorMessage: session.errorMessage,
  retryCount: session.retryCount,
  lastHeartbeat: session.lastHeartbeat,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
});

export const getState = async (sessionId: string): Promise<BrowserSessionState | null> => {
  const [session] = await db
    .select()
    .from(browserSessions)
    .where(eq(browserSessions.sessionId, sessionId))
    .limit(1);

  return session ? mapDbToState(session) : null;
};

export const setState = async (state: BrowserSessionState): Promise<void> => {
  const parsed = BrowserSessionState.safeParse(state);
  if (!parsed.success) {
    throw BrowserError.validationFailed(parsed.error.message, state.sessionId);
  }

  await db
    .insert(browserSessions)
    .values({
      sessionId: state.sessionId,
      desiredState: state.desiredState,
      currentState: state.currentState,
      streamPort: state.streamPort,
      lastUrl: state.lastUrl,
      errorMessage: state.errorMessage,
      retryCount: state.retryCount,
      lastHeartbeat: state.lastHeartbeat,
    })
    .onConflictDoUpdate({
      target: browserSessions.sessionId,
      set: {
        desiredState: state.desiredState,
        currentState: state.currentState,
        streamPort: state.streamPort,
        lastUrl: state.lastUrl,
        errorMessage: state.errorMessage,
        retryCount: state.retryCount,
        lastHeartbeat: state.lastHeartbeat,
        updatedAt: new Date(),
      },
    });
};

export const setDesiredState = async (
  sessionId: string,
  desiredState: DesiredState,
): Promise<BrowserSessionState> => {
  const [parentSession] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!parentSession) {
    throw BrowserError.sessionNotFound(sessionId);
  }

  const [session] = await db
    .insert(browserSessions)
    .values({
      sessionId,
      desiredState,
      currentState: "stopped",
    })
    .onConflictDoUpdate({
      target: browserSessions.sessionId,
      set: {
        desiredState,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!session) {
    throw BrowserError.sessionNotFound(sessionId);
  }

  return mapDbToState(session);
};

export const setCurrentState = async (
  sessionId: string,
  currentState: CurrentState,
  options: StateStoreOptions = {},
): Promise<BrowserSessionState> => {
  const updateData: Record<string, unknown> = {
    currentState,
    updatedAt: new Date(),
  };

  if (options.streamPort !== undefined) {
    updateData.streamPort = options.streamPort;
  }
  if (options.errorMessage !== undefined) {
    updateData.errorMessage = options.errorMessage;
  }
  if (options.retryCount !== undefined) {
    updateData.retryCount = options.retryCount;
  }
  if (options.lastUrl !== undefined) {
    updateData.lastUrl = options.lastUrl;
  }

  const [session] = await db
    .update(browserSessions)
    .set(updateData)
    .where(eq(browserSessions.sessionId, sessionId))
    .returning();

  if (!session) {
    throw BrowserError.sessionNotFound(sessionId);
  }

  return mapDbToState(session);
};

export const transitionState = async (
  sessionId: string,
  transition: (current: BrowserSessionState) => BrowserSessionState,
): Promise<BrowserSessionState> => {
  const current = await getState(sessionId);
  if (!current) {
    throw BrowserError.sessionNotFound(sessionId);
  }

  const newState = transition(current);
  const parsed = BrowserSessionState.safeParse(newState);
  if (!parsed.success) {
    throw BrowserError.validationFailed(parsed.error.message, sessionId);
  }

  await setState(parsed.data);
  return parsed.data;
};

export const getAllSessions = async (): Promise<BrowserSessionState[]> => {
  const allSessions = await db.select().from(browserSessions);
  return allSessions.map(mapDbToState);
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  await db.delete(browserSessions).where(eq(browserSessions.sessionId, sessionId));
};

export const updateHeartbeat = async (sessionId: string): Promise<void> => {
  const [session] = await db
    .update(browserSessions)
    .set({
      lastHeartbeat: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(browserSessions.sessionId, sessionId))
    .returning();

  if (!session) {
    throw BrowserError.sessionNotFound(sessionId);
  }
};

export const setLastUrl = async (sessionId: string, url: string | null): Promise<void> => {
  const [session] = await db
    .update(browserSessions)
    .set({
      lastUrl: url,
      updatedAt: new Date(),
    })
    .where(eq(browserSessions.sessionId, sessionId))
    .returning();

  if (!session) {
    throw BrowserError.sessionNotFound(sessionId);
  }
};

export const cleanupOrphanedSessions = async (): Promise<number> => {
  return widelog.context(async () => {
    widelog.set("event_name", "browser.state_store.orphaned_sessions_cleaned");
    widelog.time.start("duration_ms");

    try {
      const orphanedSessions = await db
        .select({ sessionId: browserSessions.sessionId })
        .from(browserSessions)
        .leftJoin(sessions, eq(sessions.id, browserSessions.sessionId))
        .where(isNull(sessions.id));

      const orphanedIds = orphanedSessions.map(({ sessionId }) => sessionId);

      if (orphanedIds.length > 0) {
        await db.delete(browserSessions).where(inArray(browserSessions.sessionId, orphanedIds));
      }

      widelog.set("orphaned_count", orphanedIds.length);
      widelog.set("outcome", "success");
      return orphanedIds.length;
    } catch (error) {
      widelog.set("outcome", "error");
      widelog.errorFields(error);
      throw error;
    } finally {
      widelog.time.stop("duration_ms");
      widelog.flush();
    }
  });
};
