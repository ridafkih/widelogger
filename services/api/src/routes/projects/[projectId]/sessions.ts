import { z } from "zod";
import { widelog } from "../../../logging";
import { spawnSession } from "../../../orchestration/session-spawner";
import { findSessionsByProjectId } from "../../../repositories/session.repository";
import { withParams } from "../../../shared/route-helpers";
import { parseRequestBody } from "../../../shared/validation";
import type { RouteContextFor } from "../../../types/route";

const createProjectSessionSchema = z.object({
  initialMessage: z.string().optional(),
  title: z.string().optional(),
});

const GET = withParams<{ projectId: string }>(
  ["projectId"],
  async ({ params: { projectId } }) => {
    widelog.set("project.id", projectId);
    const sessions = await findSessionsByProjectId(projectId);
    widelog.set("session.count", sessions.length);
    return Response.json(sessions);
  }
);

type OrchestrationContext = RouteContextFor<
  "browser" | "session" | "infra" | "proxy"
>;

const POST = withParams<{ projectId: string }, OrchestrationContext>(
  ["projectId"],
  async ({ params: { projectId }, request, context }) => {
    widelog.set("project.id", projectId);
    const body = await parseRequestBody(request, createProjectSessionSchema);

    const result = await spawnSession({
      projectId,
      taskSummary: body.initialMessage ?? body.title,
      browserService: context.browserService,
      sessionLifecycle: context.sessionLifecycle,
      poolManager: context.poolManager,
      publisher: context.publisher,
      proxyBaseDomain: context.proxyBaseDomain,
    });

    widelog.set("session.id", result.session.id);
    widelog.set("session.container_count", result.containers.length);

    return Response.json(
      {
        ...result.session,
        containers: result.containers,
      },
      { status: 201 }
    );
  }
);

export { GET, POST };
