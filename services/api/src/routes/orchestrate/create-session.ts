import { z } from "zod";
import type { RouteHandler } from "../../utils/handlers/route-handler";
import { findProjectById } from "../../utils/repositories/project.repository";
import { spawnSession } from "../../utils/orchestration/session-spawner";
import { initiateConversation } from "../../utils/orchestration/conversation-initiator";

const createSessionRequestSchema = z.object({
  projectId: z.string().min(1),
  taskSummary: z.string().optional(),
  modelId: z.string().optional(),
});

const POST: RouteHandler = async (request, _params, context) => {
  const rawBody = await request.json().catch(() => null);
  const parseResult = createSessionRequestSchema.safeParse(rawBody);

  if (!parseResult.success) {
    return Response.json(
      {
        error:
          "Invalid request body. Required: { projectId: string, taskSummary?: string, modelId?: string }",
      },
      { status: 400 },
    );
  }

  const { projectId, taskSummary, modelId } = parseResult.data;

  const project = await findProjectById(projectId);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const { session } = await spawnSession({
      projectId,
      taskSummary: taskSummary ?? "New session",
      browserService: context.browserService,
    });

    if (taskSummary) {
      await initiateConversation({
        sessionId: session.id,
        task: taskSummary,
        modelId,
      });
    }

    return Response.json(
      {
        sessionId: session.id,
        projectId: project.id,
        projectName: project.name,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[CreateSession] Error:", error);
    const message = error instanceof Error ? error.message : "Session creation failed";
    return Response.json({ error: message }, { status: 500 });
  }
};

export { POST };
