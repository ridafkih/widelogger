import { db } from "@lab/database/client";
import { containers } from "@lab/database/schema/containers";
import { sessions } from "@lab/database/schema/sessions";
import { sessionContainers } from "@lab/database/schema/session-containers";
import { eq } from "drizzle-orm";

import type { RouteHandler } from "../../../utils/route-handler";
import { publisher } from "../../../publisher";

const GET: RouteHandler = async (_request, params) => {
  const projectSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.projectId, params.projectId));
  return Response.json(projectSessions);
};

const POST: RouteHandler = async (_request, params, context) => {
  const { projectId } = params;

  const containerDefinitions = await db
    .select()
    .from(containers)
    .where(eq(containers.projectId, projectId));

  if (containerDefinitions.length === 0) {
    return Response.json({ error: "Project has no container definitions" }, { status: 400 });
  }

  const [session] = await db.insert(sessions).values({ projectId }).returning();

  const containerRows = [];
  for (const containerDefinition of containerDefinitions) {
    const displayName =
      containerDefinition.hostname ??
      containerDefinition.image.split("/").pop()?.split(":")[0] ??
      "container";

    const [sessionContainer] = await db
      .insert(sessionContainers)
      .values({
        sessionId: session.id,
        containerId: containerDefinition.id,
        dockerId: "",
        status: "starting",
      })
      .returning();

    containerRows.push({
      id: sessionContainer.id,
      name: displayName,
      status: "starting" as const,
      urls: [],
    });
  }

  publisher.publishDelta("sessions", {
    type: "add",
    session: {
      id: session.id,
      projectId: session.projectId,
      title: `${session.id.slice(0, 8)}`,
    },
  });

  publisher.publishSnapshot("sessionContainers", { uuid: session.id }, containerRows);

  context.initializeSessionContainers(session.id, projectId).catch((error) => {
    console.error(`Background session initialization failed for ${session.id}:`, error);
  });

  return Response.json(
    {
      id: session.id,
      projectId: session.projectId,
      containers: containerRows,
    },
    { status: 201 },
  );
};

export { GET, POST };
