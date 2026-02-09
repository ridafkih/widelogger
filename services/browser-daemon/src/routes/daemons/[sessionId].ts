import { NotFoundError } from "../../shared/errors";
import type { RouteHandler } from "../../types/route";

export const GET: RouteHandler = ({
  params,
  context: { daemonManager, widelog },
}) => {
  const sessionId = params.sessionId!;
  widelog.set("session.id", sessionId);

  const session = daemonManager.getSession(sessionId);

  return Response.json({
    type: "status",
    sessionId,
    running: daemonManager.isRunning(sessionId),
    ready: daemonManager.isReady(sessionId),
    port: session?.port ?? null,
    cdpPort: session?.cdpPort ?? null,
  });
};

export const POST: RouteHandler = async ({
  params,
  context: { daemonManager, widelog },
}) => {
  const sessionId = params.sessionId!;
  widelog.set("session.id", sessionId);

  const result = await daemonManager.start(sessionId);
  return Response.json(result);
};

export const DELETE: RouteHandler = ({
  params,
  context: { daemonManager, widelog },
}) => {
  const sessionId = params.sessionId!;
  widelog.set("session.id", sessionId);

  const result = daemonManager.stop(sessionId);

  if (result.type === "not_found") {
    throw new NotFoundError("Daemon session", sessionId);
  }

  return Response.json(result);
};
