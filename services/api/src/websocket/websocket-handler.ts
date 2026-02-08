import { schema, type AppSchema } from "@lab/multiplayer-sdk";
import {
  createWebSocketHandler,
  type SchemaHandlers,
  type HandlerOptions,
} from "@lab/multiplayer-server";
import type { Publisher, OpencodeClient } from "../types/dependencies";
import type { BrowserService } from "../browser/browser-service";
import type { LogMonitor } from "../monitors/log.monitor";
import type { SessionStateStore } from "../state/session-state-store";
import type { Auth } from "../types/websocket";
import {
  loadProjects,
  loadSessions,
  loadSessionContainers,
  loadSessionChangedFiles,
  loadSessionMetadata,
  loadSessionLogs,
} from "../snapshots/snapshot-loaders";
import { MESSAGE_ROLE } from "../types/message";
import { ValidationError } from "../shared/errors";
import { widelog } from "../logging";

export { type Auth } from "../types/websocket";

export interface WebSocketHandlerDeps {
  browserService: BrowserService;
  publisher: Publisher;
  opencode: OpencodeClient;
  logMonitor: LogMonitor;
  proxyBaseDomain: string;
  sessionStateStore: SessionStateStore;
}

export function createWebSocketHandlers(deps: WebSocketHandlerDeps) {
  const { browserService, publisher, opencode, logMonitor, proxyBaseDomain, sessionStateStore } =
    deps;
  const sessionSubscribers = new Map<string, Set<object>>();

  const handlers: SchemaHandlers<AppSchema, Auth> = {
    projects: {
      getSnapshot: loadProjects,
    },
    sessions: {
      getSnapshot: loadSessions,
    },
    sessionMetadata: {
      getSnapshot: async ({ params }) => {
        if (!params.uuid) throw new ValidationError("Missing uuid parameter");
        return loadSessionMetadata(params.uuid, opencode, sessionStateStore);
      },
    },
    sessionContainers: {
      getSnapshot: async ({ params }) => {
        if (!params.uuid) throw new ValidationError("Missing uuid parameter");
        return loadSessionContainers(params.uuid, proxyBaseDomain);
      },
    },
    sessionTyping: {
      getSnapshot: async () => [],
    },
    sessionPromptEngineers: {
      getSnapshot: async () => [],
    },
    sessionChangedFiles: {
      getSnapshot: async ({ params }) => {
        if (!params.uuid) throw new ValidationError("Missing uuid parameter");
        return loadSessionChangedFiles(params.uuid, opencode);
      },
    },
    sessionBranches: {
      getSnapshot: async () => [],
    },
    sessionLinks: {
      getSnapshot: async () => [],
    },
    sessionLogs: {
      getSnapshot: async ({ params }) => {
        if (!params.uuid) return { sources: [], recentLogs: {} };
        return loadSessionLogs(params.uuid, logMonitor);
      },
    },
    sessionMessages: {
      getSnapshot: async () => [],
    },
    sessionBrowserState: {
      getSnapshot: async ({ params }) => {
        if (!params.uuid) throw new ValidationError("Missing uuid parameter");
        return browserService.getBrowserSnapshot(params.uuid);
      },
      onSubscribe: ({ params, ws }) => {
        widelog.context(async () => {
          const sessionId = params.uuid;
          widelog.set("event_name", "websocket.browser_subscribe");
          widelog.set("session_id", sessionId ?? "unknown");

          if (!sessionId) {
            widelog.set("outcome", "skipped");
            widelog.flush();
            return;
          }

          if (!sessionSubscribers.has(sessionId)) {
            sessionSubscribers.set(sessionId, new Set());
          }
          const subscribers = sessionSubscribers.get(sessionId);
          if (!subscribers) {
            widelog.set("outcome", "skipped");
            widelog.flush();
            return;
          }

          if (subscribers.has(ws)) {
            widelog.set("outcome", "already_subscribed");
            widelog.flush();
            return;
          }

          subscribers.add(ws);

          try {
            await browserService.subscribeBrowser(sessionId);
            widelog.set("outcome", "success");
          } catch (error) {
            widelog.set("outcome", "error");
            widelog.errorFields(error);
          }

          widelog.flush();
        });
      },
      onUnsubscribe: ({ params, ws }) => {
        widelog.context(async () => {
          const sessionId = params.uuid;
          widelog.set("event_name", "websocket.browser_unsubscribe");
          widelog.set("session_id", sessionId ?? "unknown");

          if (!sessionId) {
            widelog.set("outcome", "skipped");
            widelog.flush();
            return;
          }

          const subscribers = sessionSubscribers.get(sessionId);

          if (!subscribers || !subscribers.has(ws)) {
            widelog.set("outcome", "not_subscribed");
            widelog.flush();
            return;
          }

          subscribers.delete(ws);

          if (subscribers.size === 0) {
            sessionSubscribers.delete(sessionId);
          }

          try {
            await browserService.unsubscribeBrowser(sessionId);
            widelog.set("outcome", "success");
          } catch (error) {
            widelog.set("outcome", "error");
            widelog.errorFields(error);
          }

          widelog.flush();
        });
      },
    },
    sessionBrowserFrames: {
      getSnapshot: async ({ params }) => {
        if (!params.uuid) return { lastFrame: null, timestamp: null };
        const frame = browserService.getCachedFrame(params.uuid);
        if (!frame) return { lastFrame: null, timestamp: null };
        return { lastFrame: frame, timestamp: Date.now() };
      },
    },
    sessionBrowserInput: {
      getSnapshot: async () => ({}),
    },
    orchestrationStatus: {
      getSnapshot: async () => ({
        status: "pending",
        projectName: null,
        sessionId: null,
        errorMessage: null,
      }),
    },
    sessionComplete: {
      getSnapshot: async () => ({ completed: false }),
    },
  };

  const options: HandlerOptions<AppSchema, Auth> = {
    authenticate: async (token) => ({ userId: token ?? "anonymous" }),
    onMessage: async (context, message) => {
      if (message.type === "send_message") {
        publisher.publishEvent(
          "sessionMessages",
          { uuid: message.sessionId },
          {
            id: message.id,
            role: MESSAGE_ROLE.USER,
            content: message.content,
            timestamp: message.timestamp,
            senderId: context.auth.userId,
          },
        );
      }
    },
  };

  return createWebSocketHandler(schema, handlers, options);
}
