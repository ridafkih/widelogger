import { findSessionsByProjectId } from "../../../utils/repositories/session.repository";
import { spawnSession } from "../../../utils/orchestration/session-spawner";
import type { RouteHandler } from "../../../utils/handlers/route-handler";

const GET: RouteHandler = async (_request, params) => {
  const sessions = await findSessionsByProjectId(params.projectId);
  return Response.json(sessions);
};

const POST: RouteHandler = async (request, params, context) => {
  const { projectId } = params;
  const body = await request.json();

  try {
    const result = await spawnSession({
      projectId,
      taskSummary: body.initialMessage || body.title || "",
      browserService: context.browserService,
    });

    return Response.json(
      {
        ...result.session,
        containers: result.containers,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create session";
    return Response.json({ error: message }, { status: 400 });
  }
};

export { GET, POST };
