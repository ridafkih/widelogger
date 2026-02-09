import { db } from "@lab/database/client";
import {
  type MessagingMode,
  type OrchestrationRequest,
  type OrchestrationStatus,
  orchestrationRequests,
  type ResolutionConfidence,
  type SummaryStatus,
} from "@lab/database/schema/orchestration-requests";
import { eq } from "drizzle-orm";
import { InternalError, orThrow } from "../shared/errors";

async function findOrchestrationBySessionId(
  sessionId: string
): Promise<OrchestrationRequest | null> {
  const [record] = await db
    .select()
    .from(orchestrationRequests)
    .where(eq(orchestrationRequests.resolvedSessionId, sessionId));
  return record ?? null;
}

export async function findOrchestrationBySessionIdOrThrow(
  sessionId: string
): Promise<OrchestrationRequest> {
  return orThrow(
    await findOrchestrationBySessionId(sessionId),
    "Orchestration for session",
    sessionId
  );
}

interface CreateOrchestrationRequestInput {
  content: string;
  channelId?: string;
  modelId?: string;
  platformOrigin?: string;
  platformChatId?: string;
  messagingMode?: MessagingMode;
}

export async function createOrchestrationRequest(
  input: CreateOrchestrationRequestInput
): Promise<string> {
  const [record] = await db
    .insert(orchestrationRequests)
    .values({
      content: input.content,
      channelId: input.channelId,
      modelId: input.modelId,
      platformOrigin: input.platformOrigin,
      platformChatId: input.platformChatId,
      messagingMode: input.messagingMode ?? "passive",
      status: "pending",
    })
    .returning({ id: orchestrationRequests.id });

  if (!record) {
    throw new InternalError(
      "Failed to create orchestration record",
      "ORCHESTRATION_CREATE_FAILED"
    );
  }
  return record.id;
}

interface UpdateOrchestrationStatusInput {
  resolvedProjectId?: string;
  resolvedSessionId?: string;
  resolutionConfidence?: ResolutionConfidence;
  resolutionReasoning?: string;
  errorMessage?: string | null;
}

export async function updateOrchestrationStatus(
  orchestrationId: string,
  status: OrchestrationStatus,
  data?: UpdateOrchestrationStatusInput
): Promise<void> {
  await db
    .update(orchestrationRequests)
    .set({
      status,
      resolvedProjectId: data?.resolvedProjectId,
      resolvedSessionId: data?.resolvedSessionId,
      resolutionConfidence: data?.resolutionConfidence,
      resolutionReasoning: data?.resolutionReasoning,
      errorMessage: data?.errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(orchestrationRequests.id, orchestrationId));
}

export async function updateOrchestrationSummaryStatus(
  id: string,
  summaryStatus: SummaryStatus,
  summaryText?: string
): Promise<void> {
  await db
    .update(orchestrationRequests)
    .set({
      summaryStatus,
      summaryText,
      updatedAt: new Date(),
      ...(summaryStatus === "sent" && { completedAt: new Date() }),
    })
    .where(eq(orchestrationRequests.id, id));
}
