import { db } from "@lab/database/client";
import {
  orchestrationRequests,
  type OrchestrationRequest,
  type SummaryStatus,
} from "@lab/database/schema/orchestration-requests";
import { eq } from "drizzle-orm";

export async function findOrchestrationById(id: string): Promise<OrchestrationRequest | null> {
  const [record] = await db
    .select()
    .from(orchestrationRequests)
    .where(eq(orchestrationRequests.id, id));
  return record ?? null;
}

export async function findOrchestrationBySessionId(
  sessionId: string,
): Promise<OrchestrationRequest | null> {
  const [record] = await db
    .select()
    .from(orchestrationRequests)
    .where(eq(orchestrationRequests.resolvedSessionId, sessionId));
  return record ?? null;
}

export async function updateOrchestrationSummaryStatus(
  id: string,
  summaryStatus: SummaryStatus,
  summaryText?: string,
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

export async function markOrchestrationCompleted(id: string): Promise<void> {
  await db
    .update(orchestrationRequests)
    .set({
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orchestrationRequests.id, id));
}
