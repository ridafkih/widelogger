import type { AppSchema } from "@lab/multiplayer-sdk";
import type { BrowserService } from "../browser/browser-service";
import type { LogMonitor } from "../monitors/log.monitor";
import { findPortsByContainerId } from "../repositories/container-port.repository";
import { getSessionContainersWithDetails } from "../repositories/container-session.repository";
import { findProjectSummaries } from "../repositories/project.repository";
import {
  findAllSessionSummaries,
  findSessionById,
} from "../repositories/session.repository";
import { formatProxyUrl } from "../shared/naming";
import { resolveWorkspacePathBySession } from "../shared/path-resolver";
import type { SessionStateStore } from "../state/session-state-store";
import { CONTAINER_STATUS, isContainerStatus } from "../types/container";
import type { OpencodeClient } from "../types/dependencies";
import { getChangeType } from "../types/file";

export async function loadProjects() {
  return findProjectSummaries();
}

export async function loadSessions() {
  const sessions = await findAllSessionSummaries();
  return sessions.map((session) => ({
    ...session,
    title: session.title ?? null,
  }));
}

export async function loadSessionContainers(
  sessionId: string,
  proxyBaseDomain: string
) {
  const rows = await getSessionContainersWithDetails(sessionId);

  return Promise.all(
    rows.map(async (row) => {
      const ports = await findPortsByContainerId(row.containerId);
      const name = row.image;
      const urls = ports.map(({ port }) => ({
        port,
        url: formatProxyUrl(sessionId, port, proxyBaseDomain),
      }));

      return {
        id: row.id,
        name,
        status: isContainerStatus(row.status)
          ? row.status
          : CONTAINER_STATUS.ERROR,
        urls,
      };
    })
  );
}

export async function loadSessionChangedFiles(
  sessionId: string,
  opencode: OpencodeClient
) {
  const session = await findSessionById(sessionId);
  if (!session?.opencodeSessionId) {
    return [];
  }

  try {
    const directory = await resolveWorkspacePathBySession(sessionId);
    const response = await opencode.session.diff({
      sessionID: session.opencodeSessionId,
      directory,
    });
    if (!response.data) {
      return [];
    }

    return response.data.map((diff) => ({
      path: diff.file,
      originalContent: diff.before,
      currentContent: diff.after,
      status: "pending" as const,
      changeType: getChangeType(diff.before, diff.after),
    }));
  } catch {
    return [];
  }
}

export function loadSessionLogs(sessionId: string, logMonitor: LogMonitor) {
  return logMonitor.getSessionSnapshot(sessionId);
}

export async function loadSessionMetadata(
  sessionId: string,
  opencode: OpencodeClient,
  sessionStateStore: SessionStateStore
) {
  const session = await findSessionById(sessionId);
  const title = session?.title ?? "";
  const [inferenceStatus, storedLastMessage] = await Promise.all([
    sessionStateStore.getInferenceStatus(sessionId),
    sessionStateStore.getLastMessage(sessionId),
  ]);

  if (!session?.opencodeSessionId) {
    return {
      title,
      lastMessage: storedLastMessage,
      inferenceStatus,
      participantCount: 0,
    };
  }

  try {
    const directory = await resolveWorkspacePathBySession(sessionId);
    const response = await opencode.session.messages({
      sessionID: session.opencodeSessionId,
      directory,
    });
    const messages = response.data ?? [];
    const lastMessage = messages.at(-1);
    const textPart = lastMessage?.parts?.find(
      (part: { type: string; text?: string }) =>
        part.type === "text" && part.text
    );

    const text = textPart && "text" in textPart && textPart.text;

    if (text) {
      await sessionStateStore.setLastMessage(sessionId, text);
      return { title, lastMessage: text, inferenceStatus, participantCount: 0 };
    }

    return {
      title,
      lastMessage: storedLastMessage,
      inferenceStatus,
      participantCount: 0,
    };
  } catch {
    return {
      title,
      lastMessage: storedLastMessage,
      inferenceStatus,
      participantCount: 0,
    };
  }
}

type ChannelName = keyof AppSchema["channels"];
type SnapshotLoader = (session: string | null) => Promise<unknown>;

export interface SnapshotLoaderDeps {
  browserService: BrowserService;
  opencode: OpencodeClient;
  logMonitor: LogMonitor;
  proxyBaseDomain: string;
  sessionStateStore: SessionStateStore;
}

export function createSnapshotLoaders(
  deps: SnapshotLoaderDeps
): Record<ChannelName, SnapshotLoader> {
  const {
    browserService,
    opencode,
    logMonitor,
    proxyBaseDomain,
    sessionStateStore,
  } = deps;

  return {
    projects: async () => loadProjects(),
    sessions: async () => loadSessions(),
    sessionMetadata: async (session) =>
      session
        ? loadSessionMetadata(session, opencode, sessionStateStore)
        : null,
    sessionContainers: async (session) =>
      session ? loadSessionContainers(session, proxyBaseDomain) : null,
    sessionTyping: async () => [],
    sessionPromptEngineers: async () => [],
    sessionChangedFiles: async (session) =>
      session ? loadSessionChangedFiles(session, opencode) : null,
    sessionBranches: async () => [],
    sessionLinks: async () => [],
    sessionLogs: async (session) =>
      session
        ? loadSessionLogs(session, logMonitor)
        : { sources: [], recentLogs: {} },
    sessionMessages: async () => [],
    sessionBrowserState: async (session) =>
      session ? browserService.getBrowserSnapshot(session) : null,
    sessionBrowserFrames: async (session) => {
      if (!session) {
        return null;
      }
      const frame = browserService.getCachedFrame(session);
      return { lastFrame: frame ?? null, timestamp: frame ? Date.now() : null };
    },
    sessionBrowserInput: async () => ({}),
    orchestrationStatus: async () => ({
      status: "pending",
      projectName: null,
      sessionId: null,
      errorMessage: null,
    }),
    sessionComplete: async () => ({ completed: false }),
  };
}
