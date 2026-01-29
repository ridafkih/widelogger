import { db } from "@lab/database/client";
import { projects } from "@lab/database/schema/projects";

import type { RouteHandler } from "../utils/route-handler";

const GET: RouteHandler = async () => {
  const allProjects = await db.select().from(projects);
  return Response.json(allProjects);
};

const POST: RouteHandler = async (request) => {
  const body = await request.json();
  const [project] = await db
    .insert(projects)
    .values({
      name: body.name,
      systemPrompt: body.systemPrompt,
    })
    .returning();
  return Response.json(project, { status: 201 });
};

export { GET, POST };
