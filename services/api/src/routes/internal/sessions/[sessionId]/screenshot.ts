import { badRequestResponse, notFoundResponse } from "../../../../shared/http";
import { findSessionById } from "../../../../utils/repositories/session.repository";
import type { RouteHandler } from "../../../../utils/handlers/route-handler";

const GET: RouteHandler = async (_request, params, context) => {
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  if (!sessionId) return badRequestResponse("Missing sessionId");

  const session = await findSessionById(sessionId);
  if (!session) return notFoundResponse("Session not found");

  const { browserService } = context;
  const cachedFrame = browserService.getCachedFrame(sessionId);

  if (!cachedFrame) {
    return notFoundResponse("No browser frame available");
  }

  return Response.json({
    sessionId,
    timestamp: Date.now(),
    format: "png",
    encoding: "base64",
    data: cachedFrame,
  });
};

export { GET };
