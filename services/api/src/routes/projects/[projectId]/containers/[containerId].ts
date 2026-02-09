import { noContentResponse } from "@lab/http-utilities";
import { z } from "zod";
import { widelog } from "../../../../logging";
import {
  clearWorkspaceContainer,
  setWorkspaceContainer,
} from "../../../../repositories/container-session.repository";
import { withParams } from "../../../../shared/route-helpers";
import { parseRequestBody } from "../../../../shared/validation";

const setWorkspaceSchema = z.object({
  isWorkspace: z.boolean(),
});

const PATCH = withParams<{ projectId: string; containerId: string }>(
  ["projectId", "containerId"],
  async ({ params: { projectId, containerId }, request }) => {
    widelog.set("project.id", projectId);
    widelog.set("container.id", containerId);
    const body = await parseRequestBody(request, setWorkspaceSchema);

    widelog.set("container.is_workspace", body.isWorkspace);

    if (body.isWorkspace) {
      await setWorkspaceContainer(projectId, containerId);
    } else {
      await clearWorkspaceContainer(projectId);
    }
    return noContentResponse();
  }
);

export { PATCH };
