import { db } from "@lab/database/client";
import { sessions } from "@lab/database/schema/sessions";
import { sessionContainers } from "@lab/database/schema/session-containers";
import { containers } from "@lab/database/schema/containers";
import { containerPorts } from "@lab/database/schema/container-ports";
import { eq, and } from "drizzle-orm";
import type { UpstreamInfo } from "../types/proxy";

export function formatUniqueHostname(sessionId: string, containerId: string): string {
  return `s-${sessionId.slice(0, 8)}-${containerId.slice(0, 8)}`;
}

export async function resolveUpstream(
  sessionId: string,
  port: number,
): Promise<UpstreamInfo | null> {
  const result = await db
    .select({
      sessionId: sessions.id,
      containerId: sessionContainers.containerId,
      sessionStatus: sessions.status,
    })
    .from(sessions)
    .innerJoin(sessionContainers, eq(sessionContainers.sessionId, sessions.id))
    .innerJoin(containers, eq(containers.id, sessionContainers.containerId))
    .innerJoin(
      containerPorts,
      and(eq(containerPorts.containerId, containers.id), eq(containerPorts.port, port)),
    )
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const row = result[0];
  if (!row || (row.sessionStatus !== "running" && row.sessionStatus !== "pooled")) {
    return null;
  }

  return {
    hostname: formatUniqueHostname(sessionId, row.containerId),
    port,
  };
}

export function parseSubdomain(host: string): { sessionId: string; port: number } | null {
  const match = host.match(/^([a-f0-9-]+)--(\d+)\./);
  if (!match) {
    return null;
  }

  const sessionId = match[1];
  const portStr = match[2];

  if (!sessionId || !portStr) {
    return null;
  }

  const port = parseInt(portStr, 10);
  if (isNaN(port)) {
    return null;
  }

  return { sessionId, port };
}
