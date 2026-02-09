import type { ImageStore } from "@lab/context";
import type { ImageAnalyzerContext } from "@lab/subagents/vision";
import type { LanguageModel } from "ai";
import type { BrowserServiceManager } from "../../managers/browser-service.manager";
import type { PoolManager } from "../../managers/pool.manager";
import type { SessionLifecycleManager } from "../../managers/session-lifecycle.manager";
import type { SessionStateStore } from "../../state/session-state-store";
import type { OpencodeClient, Publisher } from "../../types/dependencies";
import {
  createCreateSessionTool,
  createGetSessionMessagesTool,
  createGetSessionScreenshotTool,
  createGetSessionStatusTool,
  createRunBrowserTaskTool,
  createSearchSessionsTool,
  createSendMessageToSessionTool,
  getContainersTool,
  listProjectsTool,
  listSessionsTool,
} from "../tools";

interface BuildOrchestratorToolsConfig {
  browserService: BrowserServiceManager;
  sessionLifecycle: SessionLifecycleManager;
  poolManager: PoolManager;
  modelId?: string;
  createModel: () => LanguageModel;
  imageStore?: ImageStore;
  visionContext?: ImageAnalyzerContext;
  opencode: OpencodeClient;
  publisher: Publisher;
  sessionStateStore: SessionStateStore;
}

export async function buildOrchestratorTools(
  toolsConfig: BuildOrchestratorToolsConfig
) {
  const createSessionTool = createCreateSessionTool({
    browserService: toolsConfig.browserService,
    sessionLifecycle: toolsConfig.sessionLifecycle,
    poolManager: toolsConfig.poolManager,
    modelId: toolsConfig.modelId,
    opencode: toolsConfig.opencode,
    publisher: toolsConfig.publisher,
    sessionStateStore: toolsConfig.sessionStateStore,
  });

  const sendMessageToSessionTool = createSendMessageToSessionTool({
    modelId: toolsConfig.modelId,
    opencode: toolsConfig.opencode,
    publisher: toolsConfig.publisher,
    sessionStateStore: toolsConfig.sessionStateStore,
  });

  const getSessionStatusTool = createGetSessionStatusTool(
    toolsConfig.sessionStateStore
  );

  const getSessionScreenshotTool = createGetSessionScreenshotTool({
    daemonController: toolsConfig.browserService.daemonController,
    imageStore: toolsConfig.imageStore,
  });

  const runBrowserTaskTool = createRunBrowserTaskTool({
    daemonController: toolsConfig.browserService.daemonController,
    createModel: toolsConfig.createModel,
    imageStore: toolsConfig.imageStore,
  });

  const getSessionMessagesTool = createGetSessionMessagesTool(
    toolsConfig.opencode
  );
  const searchSessionsTool = createSearchSessionsTool(toolsConfig.opencode);

  const baseTools = {
    listProjects: listProjectsTool,
    listSessions: listSessionsTool,
    getSessionMessages: getSessionMessagesTool,
    getSessionStatus: getSessionStatusTool,
    searchSessions: searchSessionsTool,
    getContainers: getContainersTool,
    createSession: createSessionTool,
    sendMessageToSession: sendMessageToSessionTool,
    getSessionScreenshot: getSessionScreenshotTool,
    runBrowserTask: runBrowserTaskTool,
  };

  if (toolsConfig.visionContext) {
    const { createAnalyzeImageTool } = await import("@lab/subagents/vision");
    return {
      ...baseTools,
      analyzeImage: createAnalyzeImageTool(toolsConfig.visionContext),
    };
  }

  return baseTools;
}
