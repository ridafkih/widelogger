import { db } from "@lab/database/client";
import { sessions } from "@lab/database/schema/sessions";
import { sessionContainers } from "@lab/database/schema/session-containers";
import { eq } from "drizzle-orm";
import { DockerClient } from "@lab/sandbox-docker";

import type { RouteHandler } from "../../utils/route-handler";

const docker = new DockerClient();

const GET: RouteHandler = async (_request, params) => {
  const { sessionId } = params;

  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));

  if (!session) {
    return new Response("Not found", { status: 404 });
  }

  const containers = await db
    .select()
    .from(sessionContainers)
    .where(eq(sessionContainers.sessionId, sessionId));

  const containersWithStatus = await Promise.all(
    containers.map(async (container) => {
      const info = await docker.inspectContainer(container.dockerId);
      return { ...container, info };
    }),
  );

  return Response.json({
    ...session,
    containers: containersWithStatus,
  });
};

const DELETE: RouteHandler = async (_request, params) => {
  const { sessionId } = params;

  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));

  if (!session) {
    return new Response("Not found", { status: 404 });
  }

  // Get all containers for this session
  const containers = await db
    .select()
    .from(sessionContainers)
    .where(eq(sessionContainers.sessionId, sessionId));

  // Stop and remove all Docker containers
  await Promise.all(
    containers.map(async (container) => {
      await docker.stopContainer(container.dockerId);
      await docker.removeContainer(container.dockerId);
    }),
  );

  // Delete session (cascades to session_containers)
  await db.delete(sessions).where(eq(sessions.id, sessionId));

  return new Response(null, { status: 204 });
};

export { DELETE, GET };
