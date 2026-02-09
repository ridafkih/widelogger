import type { DaemonController } from "@lab/browser-protocol";
import type { LanguageModel } from "ai";
import type { Screenshot, SubAgentResult } from "../types";

export interface BrowserAgentContext {
  daemonController: DaemonController;
  createModel: () => LanguageModel;
}

export interface BrowserTaskResult extends SubAgentResult {
  screenshot?: Screenshot;
}

export interface ScreenshotData {
  base64: string;
}

export interface NavigateData {
  url: string;
  title: string;
}

export interface ContentData {
  html: string;
}

export interface SnapshotData {
  snapshot: string;
}

export interface RecordingStopData {
  path: string;
  frames: number;
  base64?: string;
  mimeType?: string;
  error?: string;
}
