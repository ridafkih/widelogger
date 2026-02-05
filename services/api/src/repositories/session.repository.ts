import { db } from "@lab/database/client";
import { sessions, type Session } from "@lab/database/schema/sessions";
import { eq, ne, and, count, isNull, inArray } from "drizzle-orm";
import { SESSION_STATUS } from "../types/session";
import { orThrow } from "../shared/errors";

export async function findSessionById(sessionId: string): Promise<Session | null> {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  return session ?? null;
}

export async function findSessionByIdOrThrow(sessionId: string): Promise<Session> {
  return orThrow(await findSessionById(sessionId), "Session", sessionId);
}

export async function findSessionsByProjectId(projectId: string): Promise<Session[]> {
  return db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.projectId, projectId),
        ne(sessions.status, SESSION_STATUS.DELETING),
        ne(sessions.status, SESSION_STATUS.POOLED),
      ),
    );
}

export async function createSession(projectId: string, title?: string): Promise<Session> {
  const [session] = await db.insert(sessions).values({ projectId, title }).returning();
  if (!session) throw new Error("Failed to create session");
  return session;
}

export async function updateSessionFields(
  sessionId: string,
  fields: { opencodeSessionId?: string; workspaceDirectory?: string; title?: string },
): Promise<Session | null> {
  return db.transaction(async (tx) => {
    if (fields.opencodeSessionId) {
      await tx
        .update(sessions)
        .set({
          opencodeSessionId: fields.opencodeSessionId,
          ...(fields.workspaceDirectory && { workspaceDirectory: fields.workspaceDirectory }),
          updatedAt: new Date(),
        })
        .where(and(eq(sessions.id, sessionId), isNull(sessions.opencodeSessionId)));

      if (fields.workspaceDirectory) {
        await tx
          .update(sessions)
          .set({ workspaceDirectory: fields.workspaceDirectory, updatedAt: new Date() })
          .where(and(eq(sessions.id, sessionId), isNull(sessions.workspaceDirectory)));
      }
    }

    if (fields.title !== undefined) {
      await tx
        .update(sessions)
        .set({ title: fields.title, updatedAt: new Date() })
        .where(eq(sessions.id, sessionId));
    }

    const [session] = await tx.select().from(sessions).where(eq(sessions.id, sessionId));
    return session ?? null;
  });
}

export async function getSessionWorkspaceDirectory(sessionId: string): Promise<string | null> {
  const [session] = await db
    .select({ workspaceDirectory: sessions.workspaceDirectory })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  return session?.workspaceDirectory ?? null;
}

export async function updateSessionTitle(
  sessionId: string,
  title?: string,
): Promise<Session | null> {
  await db.update(sessions).set({ title, updatedAt: new Date() }).where(eq(sessions.id, sessionId));

  return findSessionById(sessionId);
}

export async function updateSessionStatus(sessionId: string, status: string): Promise<void> {
  await db
    .update(sessions)
    .set({ status, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function getAllSessionsWithOpencodeId(): Promise<
  { id: string; opencodeSessionId: string | null }[]
> {
  return db
    .select({ id: sessions.id, opencodeSessionId: sessions.opencodeSessionId })
    .from(sessions);
}

export async function findAllSessionSummaries(): Promise<
  { id: string; projectId: string; title: string | null }[]
> {
  return db
    .select({ id: sessions.id, projectId: sessions.projectId, title: sessions.title })
    .from(sessions)
    .where(
      and(ne(sessions.status, SESSION_STATUS.DELETING), ne(sessions.status, SESSION_STATUS.POOLED)),
    );
}

export async function getSessionOpencodeId(sessionId: string): Promise<string | null> {
  const [session] = await db
    .select({ opencodeSessionId: sessions.opencodeSessionId })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  return session?.opencodeSessionId ?? null;
}

export async function findRunningSessions(): Promise<{ id: string }[]> {
  return db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.status, SESSION_STATUS.RUNNING));
}

export async function findActiveSessionsForReconciliation(): Promise<{ id: string }[]> {
  return db
    .select({ id: sessions.id })
    .from(sessions)
    .where(inArray(sessions.status, [SESSION_STATUS.RUNNING, SESSION_STATUS.POOLED]));
}

export async function claimPooledSession(projectId: string): Promise<Session | null> {
  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.projectId, projectId), eq(sessions.status, SESSION_STATUS.POOLED)))
      .limit(1)
      .for("update", { skipLocked: true });

    if (!candidate) {
      return null;
    }

    const [session] = await tx
      .update(sessions)
      .set({ status: SESSION_STATUS.RUNNING, updatedAt: new Date() })
      .where(eq(sessions.id, candidate.id))
      .returning();

    return session ?? null;
  });
}

export async function countPooledSessions(projectId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(sessions)
    .where(and(eq(sessions.projectId, projectId), eq(sessions.status, SESSION_STATUS.POOLED)));
  return result?.count ?? 0;
}

export async function findPooledSessions(projectId: string, limit?: number): Promise<Session[]> {
  const query = db
    .select()
    .from(sessions)
    .where(and(eq(sessions.projectId, projectId), eq(sessions.status, SESSION_STATUS.POOLED)));

  if (limit !== undefined) {
    return query.limit(limit);
  }

  return query;
}

export async function createPooledSession(projectId: string): Promise<Session> {
  const [session] = await db
    .insert(sessions)
    .values({ projectId, status: SESSION_STATUS.POOLED })
    .returning();
  if (!session) throw new Error("Failed to create pooled session");
  return session;
}
