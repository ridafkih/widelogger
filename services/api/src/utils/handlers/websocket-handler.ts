import { schema, type AppSchema } from "@lab/multiplayer-sdk";
import {
  createWebSocketHandler,
  type SchemaHandlers,
  type HandlerOptions,
} from "@lab/multiplayer-server";
import { publisher } from "../../clients/publisher";
import type { BrowserService } from "../browser/browser-service";
import type { Auth } from "../../types/websocket";
import {
  loadProjects,
  loadSessions,
  loadSessionContainers,
  loadSessionChangedFiles,
  loadSessionMetadata,
  loadSessionLogs,
} from "../snapshots/snapshot-loaders";

export { type Auth } from "../../types/websocket";

export function createWebSocketHandlers(browserService: BrowserService) {
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
        if (!params.uuid) throw new Error("Missing uuid parameter");
        return loadSessionMetadata(params.uuid);
      },
    },
    sessionContainers: {
      getSnapshot: async ({ params }) => {
        if (!params.uuid) throw new Error("Missing uuid parameter");
        return loadSessionContainers(params.uuid);
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
        if (!params.uuid) throw new Error("Missing uuid parameter");
        return loadSessionChangedFiles(params.uuid);
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
        return loadSessionLogs(params.uuid);
      },
    },
    sessionMessages: {
      getSnapshot: async () => [],
    },
    sessionBrowserState: {
      getSnapshot: async ({ params }) => {
        if (!params.uuid) throw new Error("Missing uuid parameter");
        return browserService.getBrowserSnapshot(params.uuid);
      },
      onSubscribe: ({ params, ws }) => {
        const sessionId = params.uuid;
        if (!sessionId) return;

        if (!sessionSubscribers.has(sessionId)) {
          sessionSubscribers.set(sessionId, new Set());
        }
        const subscribers = sessionSubscribers.get(sessionId);
        if (!subscribers) return;

        if (subscribers.has(ws)) return;

        subscribers.add(ws);
        browserService.subscribeBrowser(sessionId).catch((error) => {
          console.warn(`[WebSocket] Failed to subscribe to browser ${sessionId}:`, error);
        });
      },
      onUnsubscribe: ({ params, ws }) => {
        const sessionId = params.uuid;
        if (!sessionId) return;

        const subscribers = sessionSubscribers.get(sessionId);

        if (!subscribers || !subscribers.has(ws)) return;

        subscribers.delete(ws);

        if (subscribers.size === 0) {
          sessionSubscribers.delete(sessionId);
        }

        browserService.unsubscribeBrowser(sessionId).catch((error) => {
          console.warn(`[WebSocket] Failed to unsubscribe from browser ${sessionId}:`, error);
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
            role: "user",
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
