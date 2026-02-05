import { findSessionContainersBySessionId } from "../repositories/container-session.repository";
import {
  deleteSession,
  findSessionById,
  updateSessionStatus,
} from "../repositories/session.repository";
import { SESSION_STATUS } from "../types/session";
import { clearAllSessionState } from "../state/state.service";
import type { BrowserService } from "../browser/browser-service";
import type { Sandbox, Publisher } from "../types/dependencies";
import type { ProxyManager } from "./proxy";

interface ContainerCleanupResult {
  dockerId: string;
  success: boolean;
  stillExists: boolean;
  error?: unknown;
}

function logContainerCleanupFailures(results: ContainerCleanupResult[], sessionId: string): void {
  const failures = results.filter((result) => !result.success);

  for (const failure of failures) {
    if (failure.error) {
      console.error(
        `[SessionCleanup] Failed to cleanup container dockerId=${failure.dockerId} sessionId=${sessionId}:`,
        failure.error,
      );
    } else if (failure.stillExists) {
      console.error(
        `[SessionCleanup] Container dockerId=${failure.dockerId} still exists after cleanup sessionId=${sessionId}`,
      );
    }
  }
}

export interface CleanupSessionDeps {
  sandbox: Sandbox;
  publisher: Publisher;
  proxyManager: ProxyManager;
  cleanupSessionNetwork: (sessionId: string) => Promise<void>;
}

export interface CleanupOptions {
  dockerIds?: string[];
  markStatus?: "deleting" | "error";
  unregisterProxy?: boolean;
  deleteFromDb?: boolean;
  clearState?: boolean;
  publishEvents?: boolean;
  projectId?: string;
}

export async function cleanupSessionResources(
  sessionId: string,
  browserService: BrowserService,
  deps: CleanupSessionDeps,
  options: CleanupOptions = {},
): Promise<void> {
  const { sandbox, publisher, proxyManager, cleanupSessionNetwork } = deps;
  const { provider } = sandbox;
  const {
    dockerIds: providedDockerIds,
    markStatus,
    unregisterProxy = false,
    deleteFromDb = false,
    clearState = false,
    publishEvents = false,
    projectId,
  } = options;

  // Mark status
  if (markStatus === "deleting") {
    await updateSessionStatus(sessionId, SESSION_STATUS.DELETING);
  } else if (markStatus === "error") {
    await updateSessionStatus(sessionId, markStatus);
  }

  // Publish pre-cleanup events
  if (publishEvents && markStatus === "deleting") {
    const session = await findSessionById(sessionId);
    if (session) {
      publisher.publishDelta("sessions", {
        type: "remove",
        session: {
          id: session.id,
          projectId: session.projectId,
          title: session.title,
        },
      });
    }
  }

  if (publishEvents && markStatus === "error") {
    publisher.publishDelta("sessions", {
      type: "remove",
      session: { id: sessionId, projectId: projectId ?? "", title: null },
    });
  }

  // Determine docker IDs to clean up
  let dockerIds = providedDockerIds;
  if (!dockerIds) {
    const containers = await findSessionContainersBySessionId(sessionId);
    dockerIds = containers.filter((c) => c.dockerId).map((c) => c.dockerId);
  }

  // Stop/remove containers
  const cleanupResults = await Promise.allSettled(
    dockerIds.map(async (dockerId) => {
      try {
        await provider.stopContainer(dockerId);
        await provider.removeContainer(dockerId);
        const stillExists = await provider.containerExists(dockerId);
        return { dockerId, success: !stillExists, stillExists };
      } catch (error) {
        return { dockerId, success: false, stillExists: true, error };
      }
    }),
  );

  const fulfilledResults = cleanupResults
    .filter(
      (result): result is PromiseFulfilledResult<ContainerCleanupResult> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);

  logContainerCleanupFailures(fulfilledResults, sessionId);

  // Stop browser
  await browserService.forceStopBrowser(sessionId);

  // Unregister proxy
  if (unregisterProxy) {
    try {
      await proxyManager.unregisterCluster(sessionId);
    } catch (error) {
      console.warn(
        `[SessionCleanup] Failed to unregister proxy cluster sessionId=${sessionId}:`,
        error,
      );
    }
  }

  // Cleanup network
  try {
    await cleanupSessionNetwork(sessionId);
  } catch (error) {
    console.error(`[SessionCleanup] Failed to cleanup network sessionId=${sessionId}:`, error);
  }

  // Delete from DB
  if (deleteFromDb) {
    await deleteSession(sessionId);
  }

  // Clear state
  if (clearState) {
    clearAllSessionState(sessionId);
  }
}

export async function cleanupSession(
  sessionId: string,
  browserService: BrowserService,
  deps: CleanupSessionDeps,
): Promise<void> {
  const session = await findSessionById(sessionId);
  if (!session) return;

  await cleanupSessionResources(sessionId, browserService, deps, {
    markStatus: "deleting",
    unregisterProxy: true,
    deleteFromDb: true,
    clearState: true,
    publishEvents: true,
  });
}
