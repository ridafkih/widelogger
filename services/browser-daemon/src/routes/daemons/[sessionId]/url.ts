import type { UrlResponse } from "@lab/browser-protocol";
import { NotFoundError } from "../../../shared/errors";
import type { RouteHandler } from "../../../types/route";

export const GET: RouteHandler = ({
  params,
  context: { daemonManager, widelog },
}) => {
  const sessionId = params.sessionId!;
  widelog.set("session.id", sessionId);

  const session = daemonManager.getSession(sessionId);
  if (!session) {
    throw new NotFoundError("Daemon session", sessionId);
  }

  const url = daemonManager.getCurrentUrl(sessionId);
  const response: UrlResponse = { url };
  return Response.json(response);
};
