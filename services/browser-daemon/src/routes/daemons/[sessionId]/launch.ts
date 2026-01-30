import type { RouteHandler } from "../../../utils/route-handler";
import { getCurrentUrl } from "../../../utils/agent-browser";

export const POST: RouteHandler = async (_request, params, { daemonManager }) => {
  const sessionId = params.sessionId;
  if (!sessionId) {
    return Response.json({ error: "Session ID required" }, { status: 400 });
  }

  const session = daemonManager.getOrRecoverSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    const url = await getCurrentUrl(sessionId);
    return Response.json({ sessionId, launched: true, url, port: session.port, ready: session.ready });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
};
