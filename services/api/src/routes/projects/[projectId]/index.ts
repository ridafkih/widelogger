import { noContentResponse } from "@lab/http-utilities";
import { z } from "zod";
import { widelog } from "../../../logging";
import {
  deleteProject,
  findProjectByIdOrThrow,
  updateProject,
} from "../../../repositories/project.repository";
import { withParams } from "../../../shared/route-helpers";
import { parseRequestBody } from "../../../shared/validation";

const updateProjectSchema = z.object({
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
});

const GET = withParams<{ projectId: string }>(
  ["projectId"],
  async ({ params: { projectId } }) => {
    widelog.set("project.id", projectId);
    const project = await findProjectByIdOrThrow(projectId);
    return Response.json(project);
  }
);

const PATCH = withParams<{ projectId: string }>(
  ["projectId"],
  async ({ params: { projectId }, request }) => {
    widelog.set("project.id", projectId);
    const body = await parseRequestBody(request, updateProjectSchema);

    await findProjectByIdOrThrow(projectId);
    const project = await updateProject(projectId, {
      description: body.description,
      systemPrompt: body.systemPrompt,
    });
    return Response.json(project);
  }
);

const DELETE = withParams<{ projectId: string }>(
  ["projectId"],
  async ({ params: { projectId } }) => {
    widelog.set("project.id", projectId);
    await deleteProject(projectId);
    return noContentResponse();
  }
);

export { DELETE, GET, PATCH };
