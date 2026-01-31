import type { UrlResponse } from "@lab/browser-protocol";
import type { RouteHandler } from "../../../utils/route-handler";
import { notFoundResponse } from "../../../shared/http";

export const GET: RouteHandler = (_request, params, { daemonManager }) => {
  const sessionId = params.sessionId!;

  const session = daemonManager.getSession(sessionId);
  if (!session) {
    return notFoundResponse("Session not found");
  }

  const url = daemonManager.getCurrentUrl(sessionId);
  const response: UrlResponse = { url };
  return Response.json(response);
};
