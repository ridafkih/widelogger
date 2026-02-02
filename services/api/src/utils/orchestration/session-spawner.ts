import type { Session } from "@lab/database/schema/sessions";
import { claimPooledSession } from "../pool/pool-manager";
import { createSession } from "../repositories/session.repository";
import {
  findContainersByProjectId,
  createSessionContainer,
  getSessionContainersWithDetails,
} from "../repositories/container.repository";
import { publisher } from "../../clients/publisher";
import type { BrowserService } from "../browser/browser-service";
import { initializeSessionContainers } from "../docker/containers";
import { reconcilePool } from "../pool/pool-manager";
import { generateSessionTitle } from "../title-generation/title-generator";

export interface SpawnSessionOptions {
  projectId: string;
  taskSummary: string;
  browserService: BrowserService;
}

export interface SpawnSessionResult {
  session: Session;
  containers: Array<{
    id: string;
    name: string;
    status: "starting" | "running" | "stopped" | "error";
    urls: Array<{ port: number; url: string }>;
  }>;
}

type ContainerRow = SpawnSessionResult["containers"][number];
type ContainerStatus = ContainerRow["status"];

function validateContainerStatus(status: string): ContainerStatus {
  if (status === "starting" || status === "running" || status === "stopped" || status === "error") {
    return status;
  }
  throw new Error(`Invalid container status: ${status}`);
}

function extractContainerDisplayName(container: {
  hostname: string | null;
  image: string;
}): string {
  if (container.hostname) {
    return container.hostname;
  }
  const imageName = container.image.split("/").pop()?.split(":")[0];
  if (!imageName) {
    throw new Error(`Unable to extract display name from container image: ${container.image}`);
  }
  return imageName;
}

function publishSessionCreated(session: Session, containers: ContainerRow[]): void {
  publisher.publishDelta("sessions", {
    type: "add",
    session: { id: session.id, projectId: session.projectId, title: session.title },
  });
  publisher.publishSnapshot("sessionContainers", { uuid: session.id }, containers);
}

function scheduleBackgroundWork(
  sessionId: string,
  projectId: string,
  browserService: BrowserService,
): void {
  initializeSessionContainers(sessionId, projectId, browserService).catch((error) => {
    console.error(`[Orchestration] Background initialization failed for ${sessionId}:`, error);
  });
  reconcilePool(projectId).catch((error) => {
    console.error(`[Orchestration] Pool reconciliation failed for project ${projectId}:`, error);
  });
}

async function claimAndPreparePooledSession(projectId: string): Promise<SpawnSessionResult | null> {
  const pooledSession = await claimPooledSession(projectId);
  if (!pooledSession) {
    return null;
  }

  const existingContainers = await getSessionContainersWithDetails(pooledSession.id);
  const containers: ContainerRow[] = existingContainers.map((container) => ({
    id: container.id,
    name: extractContainerDisplayName(container),
    status: validateContainerStatus(container.status),
    urls: [],
  }));

  publishSessionCreated(pooledSession, containers);
  return { session: pooledSession, containers };
}

async function createSessionWithContainers(projectId: string): Promise<SpawnSessionResult> {
  const containerDefinitions = await findContainersByProjectId(projectId);
  if (containerDefinitions.length === 0) {
    throw new Error("Project has no container definitions");
  }

  const session = await createSession(projectId);
  const containers: ContainerRow[] = [];

  for (const definition of containerDefinitions) {
    const sessionContainer = await createSessionContainer({
      sessionId: session.id,
      containerId: definition.id,
      dockerId: "",
      status: "starting",
    });

    containers.push({
      id: sessionContainer.id,
      name: extractContainerDisplayName(definition),
      status: "starting",
      urls: [],
    });
  }

  publishSessionCreated(session, containers);
  return { session, containers };
}

export async function spawnSession(options: SpawnSessionOptions): Promise<SpawnSessionResult> {
  const { projectId, taskSummary, browserService } = options;

  const pooledResult = await claimAndPreparePooledSession(projectId);
  if (pooledResult) {
    scheduleBackgroundTitleGeneration(pooledResult.session.id, taskSummary);
    return pooledResult;
  }

  const result = await createSessionWithContainers(projectId);
  scheduleBackgroundWork(result.session.id, projectId, browserService);
  scheduleBackgroundTitleGeneration(result.session.id, taskSummary);
  return result;
}

function scheduleBackgroundTitleGeneration(sessionId: string, userMessage: string): void {
  if (!userMessage?.trim()) {
    return;
  }

  generateSessionTitle({
    sessionId,
    userMessage,
    fallbackTitle: userMessage.slice(0, 50).trim(),
  }).catch((error) => {
    console.error(`[SessionSpawner] Title generation failed for ${sessionId}:`, error);
  });
}
