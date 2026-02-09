import { widelog } from "../../../../logging";
import { getWorkspaceContainerRuntimeId } from "../../../../repositories/container-session.repository";
import { NotFoundError } from "../../../../shared/errors";
import { formatContainerWorkspacePath } from "../../../../shared/naming";
import { withParams } from "../../../../shared/route-helpers";

const GET = withParams<{ sessionId: string }>(
  ["sessionId"],
  async ({ params: { sessionId } }) => {
    widelog.set("session.id", sessionId);
    const result = await getWorkspaceContainerRuntimeId(sessionId);
    widelog.set("container.found", !!result);
    if (!result) {
      throw new NotFoundError("Workspace container");
    }

    return Response.json({
      runtimeId: result.runtimeId,
      workdir: formatContainerWorkspacePath(sessionId, result.containerId),
    });
  }
);

export { GET };
