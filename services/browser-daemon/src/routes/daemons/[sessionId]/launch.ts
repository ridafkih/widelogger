import { NotFoundError, ValidationError } from "../../../shared/errors";
import type { RouteHandler } from "../../../types/route";

export const POST: RouteHandler = ({
  params,
  context: { daemonManager, widelog },
}) => {
  const sessionId = params.sessionId;
  if (!sessionId) {
    throw new ValidationError("Session ID required");
  }

  widelog.set("session.id", sessionId);

  const session = daemonManager.getOrRecoverSession(sessionId);
  if (!session) {
    throw new NotFoundError("Daemon session", sessionId);
  }

  const url = daemonManager.getCurrentUrl(sessionId);
  return Response.json({
    sessionId,
    launched: true,
    url,
    port: session.port,
    cdpPort: session.cdpPort,
    ready: session.ready,
  });
};
