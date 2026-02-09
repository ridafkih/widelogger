import { widelog } from "../../logging";
import { clearGitHubOAuthToken } from "../../repositories/github-settings.repository";
import type { Handler, NoRouteContext } from "../../types/route";

const POST: Handler<NoRouteContext> = async () => {
  widelog.set("github.action", "disconnect");
  await clearGitHubOAuthToken();
  return Response.json({ success: true });
};

export { POST };
