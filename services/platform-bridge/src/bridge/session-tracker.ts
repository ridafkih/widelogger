import { eq, and, sql } from "drizzle-orm";
import { db } from "@lab/database/client";
import {
  platformChatMappings,
  type PlatformChatMapping,
} from "@lab/database/schema/platform-chat-mappings";
import type { PlatformType } from "../types/messages";
import { config } from "../config/environment";

export interface ChatMapping {
  sessionId: string;
  threadId: string | null;
  lastActivityAt: Date;
}

export class SessionTracker {
  async getMapping(platform: PlatformType, chatId: string): Promise<ChatMapping | null> {
    const [mapping] = await db
      .select({
        sessionId: platformChatMappings.sessionId,
        threadId: platformChatMappings.threadId,
        lastActivityAt: platformChatMappings.lastActivityAt,
      })
      .from(platformChatMappings)
      .where(
        and(
          eq(platformChatMappings.platform, platform),
          eq(platformChatMappings.platformChatId, chatId),
        ),
      );

    if (!mapping) return null;

    const now = Date.now();
    const lastActivity = mapping.lastActivityAt.getTime();
    if (now - lastActivity > config.staleSessionThresholdMs) {
      return null;
    }

    return mapping;
  }

  async setMapping(
    platform: PlatformType,
    chatId: string,
    sessionId: string,
    userId?: string,
    threadId?: string,
  ): Promise<void> {
    await db
      .insert(platformChatMappings)
      .values({
        platform,
        platformChatId: chatId,
        platformUserId: userId,
        threadId,
        sessionId,
      })
      .onConflictDoUpdate({
        target: [platformChatMappings.platform, platformChatMappings.platformChatId],
        set: {
          sessionId,
          platformUserId: userId,
          threadId,
          lastActivityAt: new Date(),
        },
      });
  }

  async touchMapping(platform: PlatformType, chatId: string): Promise<void> {
    await db
      .update(platformChatMappings)
      .set({ lastActivityAt: new Date() })
      .where(
        and(
          eq(platformChatMappings.platform, platform),
          eq(platformChatMappings.platformChatId, chatId),
        ),
      );
  }

  async deleteMapping(platform: PlatformType, chatId: string): Promise<void> {
    await db
      .delete(platformChatMappings)
      .where(
        and(
          eq(platformChatMappings.platform, platform),
          eq(platformChatMappings.platformChatId, chatId),
        ),
      );
  }

  async getMappingsBySession(sessionId: string): Promise<PlatformChatMapping[]> {
    return db
      .select()
      .from(platformChatMappings)
      .where(eq(platformChatMappings.sessionId, sessionId));
  }

  async cleanupStaleMappings(): Promise<number> {
    const threshold = new Date(Date.now() - config.staleSessionThresholdMs);
    const result = await db
      .delete(platformChatMappings)
      .where(sql`${platformChatMappings.lastActivityAt} < ${threshold}`)
      .returning({ id: platformChatMappings.id });

    return result.length;
  }
}

export const sessionTracker = new SessionTracker();
