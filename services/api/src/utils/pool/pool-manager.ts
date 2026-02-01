import { config } from "../../config/environment";
import {
  claimPooledSession as claimFromDb,
  countPooledSessions,
  createPooledSession as createInDb,
} from "../repositories/session.repository";
import { findAllProjects } from "../repositories/project.repository";
import {
  findContainersByProjectId,
  createSessionContainer,
} from "../repositories/container.repository";
import { initializeSessionContainers } from "../docker/containers";
import type { BrowserService } from "../browser/browser-service";
import type { Session } from "@lab/database/schema/sessions";

interface PoolStats {
  available: number;
  target: number;
}

let browserServiceRef: BrowserService | null = null;
const replenishLocks = new Map<string, Promise<void>>();

export function setPoolBrowserService(browserService: BrowserService): void {
  browserServiceRef = browserService;
}

export function getTargetPoolSize(): number {
  return config.poolSize;
}

export async function getPoolStats(projectId: string): Promise<PoolStats> {
  const available = await countPooledSessions(projectId);
  return {
    available,
    target: getTargetPoolSize(),
  };
}

export async function claimPooledSession(projectId: string): Promise<Session | null> {
  const targetSize = getTargetPoolSize();
  console.log(`Pool: Attempting to claim for project ${projectId}, pool size: ${targetSize}`);

  if (targetSize === 0) {
    console.log("Pool: Pool size is 0, skipping claim");
    return null;
  }

  const session = await claimFromDb(projectId);
  console.log(`Pool: Claim result for project ${projectId}:`, session?.id ?? "null");

  if (session) {
    replenishPool(projectId).catch((error) =>
      console.error(`Failed to replenish pool for project ${projectId}:`, error),
    );
  }

  return session;
}

export async function createPooledSession(projectId: string): Promise<Session | null> {
  if (!browserServiceRef) {
    console.warn("Pool manager: Browser service not set, cannot create pooled session");
    return null;
  }

  const containerDefinitions = await findContainersByProjectId(projectId);
  if (containerDefinitions.length === 0) {
    return null;
  }

  const session = await createInDb(projectId);

  for (const containerDefinition of containerDefinitions) {
    await createSessionContainer({
      sessionId: session.id,
      containerId: containerDefinition.id,
      dockerId: "",
      status: "starting",
    });
  }

  try {
    await initializeSessionContainers(session.id, projectId, browserServiceRef);
    console.log(`Pool: Created pooled session ${session.id} for project ${projectId}`);
    return session;
  } catch (error) {
    console.error(`Pool: Failed to initialize pooled session ${session.id}:`, error);
    return null;
  }
}

async function doReplenish(projectId: string): Promise<void> {
  const targetSize = getTargetPoolSize();
  if (targetSize === 0) {
    return;
  }

  while (true) {
    const currentCount = await countPooledSessions(projectId);
    if (currentCount >= targetSize) {
      break;
    }

    console.log(
      `Pool: Replenishing for project ${projectId} (current: ${currentCount}, target: ${targetSize})`,
    );
    await createPooledSession(projectId);
  }
}

export async function replenishPool(projectId: string): Promise<void> {
  const existing = replenishLocks.get(projectId);
  if (existing) {
    return existing;
  }

  const promise = doReplenish(projectId).finally(() => {
    replenishLocks.delete(projectId);
  });

  replenishLocks.set(projectId, promise);
  return promise;
}

export async function replenishAllPools(): Promise<void> {
  if (getTargetPoolSize() === 0) {
    return;
  }

  const projects = await findAllProjects();

  for (const project of projects) {
    try {
      await replenishPool(project.id);
    } catch (error) {
      console.error(`Pool: Failed to replenish pool for project ${project.id}:`, error);
    }
  }
}

export function initializePool(): void {
  if (getTargetPoolSize() === 0) {
    console.log("Pool: Pool size is 0, disabled");
    return;
  }

  console.log(`Pool: Initializing with target size ${getTargetPoolSize()}`);
  replenishAllPools().catch((error) => console.error("Pool: Initial replenishment failed:", error));
}
