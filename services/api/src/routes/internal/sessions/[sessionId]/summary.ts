import { z } from "zod";
import type { RouteHandler } from "../../../../utils/handlers/route-handler";
import { generateTaskSummary } from "../../../../utils/summary/summary-generator";
import {
  findOrchestrationBySessionId,
  updateOrchestrationSummaryStatus,
} from "../../../../utils/repositories/orchestration-request.repository";

const summaryRequestSchema = z.object({
  originalTask: z.string().optional(),
});

const POST: RouteHandler = async (request, params) => {
  const sessionId = params?.sessionId;

  if (!sessionId || typeof sessionId !== "string") {
    return Response.json({ error: "Session ID is required" }, { status: 400 });
  }

  const rawBody = await request.json().catch(() => ({}));
  const parseResult = summaryRequestSchema.safeParse(rawBody);

  if (!parseResult.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const orchestration = await findOrchestrationBySessionId(sessionId);

  if (!orchestration) {
    return Response.json({ error: "No orchestration found for session" }, { status: 404 });
  }

  if (orchestration.messagingMode !== "passive") {
    return Response.json(
      { error: "Summary generation only available for passive messaging mode" },
      { status: 400 },
    );
  }

  if (orchestration.summaryStatus === "sent") {
    return Response.json({
      success: true,
      summary: orchestration.summaryText,
      alreadySent: true,
    });
  }

  try {
    await updateOrchestrationSummaryStatus(orchestration.id, "generating");

    const originalTask = parseResult.data.originalTask || orchestration.content;
    const summary = await generateTaskSummary({
      sessionId,
      originalTask,
      platformOrigin: orchestration.platformOrigin ?? undefined,
    });

    await updateOrchestrationSummaryStatus(orchestration.id, "sent", summary.summary);

    return Response.json({
      success: summary.success,
      outcome: summary.outcome,
      summary: summary.summary,
      orchestrationId: orchestration.id,
      platformOrigin: orchestration.platformOrigin,
      platformChatId: orchestration.platformChatId,
    });
  } catch (error) {
    await updateOrchestrationSummaryStatus(orchestration.id, "failed");
    console.error("[Summary] Error generating summary:", error);
    const message = error instanceof Error ? error.message : "Summary generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
};

export { POST };
