import { db } from "@lab/database/client";
import {
  type OrchestratorMessage,
  type OrchestratorMessageRole,
  orchestratorMessages,
} from "@lab/database/schema/orchestrator-messages";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { InternalError } from "../shared/errors";

export async function saveOrchestratorMessage(params: {
  platform: string;
  platformChatId: string;
  role: OrchestratorMessageRole;
  content: string;
  sessionId?: string;
}): Promise<OrchestratorMessage> {
  const [message] = await db
    .insert(orchestratorMessages)
    .values({
      platform: params.platform,
      platformChatId: params.platformChatId,
      role: params.role,
      content: params.content,
      sessionId: params.sessionId,
    })
    .returning();

  if (!message) {
    throw new InternalError(
      "Failed to save orchestrator message",
      "ORCHESTRATOR_MESSAGE_SAVE_FAILED"
    );
  }

  return message;
}

async function getOrchestratorMessages(params: {
  platform: string;
  platformChatId: string;
  limit?: number;
}): Promise<OrchestratorMessage[]> {
  // Use a subquery to get the most recent N messages, then order ascending
  // This avoids the in-memory reverse() operation
  const limit = params.limit ?? 20;

  // Get the most recent messages by using desc order, limit, then re-query in asc order
  const recentMessages = await db
    .select({ id: orchestratorMessages.id })
    .from(orchestratorMessages)
    .where(
      and(
        eq(orchestratorMessages.platform, params.platform),
        eq(orchestratorMessages.platformChatId, params.platformChatId)
      )
    )
    .orderBy(desc(orchestratorMessages.createdAt))
    .limit(limit);

  if (recentMessages.length === 0) {
    return [];
  }

  const messageIds = recentMessages.map((m) => m.id);

  return db
    .select()
    .from(orchestratorMessages)
    .where(inArray(orchestratorMessages.id, messageIds))
    .orderBy(asc(orchestratorMessages.createdAt));
}

export async function getConversationHistory(params: {
  platform: string;
  platformChatId: string;
  limit?: number;
}): Promise<string[]> {
  const messages = await getOrchestratorMessages(params);
  return messages.map((msg) => `${msg.role}: ${msg.content}`);
}
