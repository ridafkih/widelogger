import type { ImageStore } from "@lab/context";
import type { BrowserServiceManager } from "../managers/browser-service.manager";
import type { PoolManager } from "../managers/pool.manager";
import type { SessionLifecycleManager } from "../managers/session-lifecycle.manager";
import type { LogMonitor } from "../monitors/log.monitor";
import type { SessionStateStore } from "../state/session-state-store";
import type { OpencodeClient, Publisher, Sandbox } from "./dependencies";
import type { PromptService } from "./prompt";

export interface BrowserContext {
  browserService: BrowserServiceManager;
  imageStore?: ImageStore;
}

export interface SessionContext {
  sessionLifecycle: SessionLifecycleManager;
  poolManager: PoolManager;
}

export interface InfraContext {
  sandbox: Sandbox;
  opencode: OpencodeClient;
  publisher: Publisher;
  sessionStateStore: SessionStateStore;
}

export interface MonitorContext {
  logMonitor: LogMonitor;
}

export interface GithubContext {
  githubClientId?: string;
  githubClientSecret?: string;
  githubCallbackUrl?: string;
  frontendUrl?: string;
}

export interface ProxyContext {
  proxyBaseDomain: string;
}

export interface PromptContext {
  promptService?: PromptService;
}
