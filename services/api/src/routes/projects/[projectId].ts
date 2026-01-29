import { db } from "@lab/database/client";
import { projects } from "@lab/database/schema/projects";
import { eq } from "drizzle-orm";

import type { RouteHandler } from "../../utils/route-handler";

const GET: RouteHandler = async (_request, params) => {
  const [project] = await db.select().from(projects).where(eq(projects.id, params.projectId));
  if (!project) return new Response("Not found", { status: 404 });
  return Response.json(project);
};

const DELETE: RouteHandler = async (_request, params) => {
  await db.delete(projects).where(eq(projects.id, params.projectId));
  return new Response(null, { status: 204 });
};

export { DELETE, GET };
