import type { DaemonController } from "@lab/browser-protocol";
import type { ExecutionStep, Screenshot } from "../types";
import { runAgentLoop } from "./loop";
import type {
  BrowserAgentContext,
  BrowserTaskResult,
  ScreenshotData,
} from "./types";

function generateSessionId(): string {
  return `browser-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function waitForDaemonReady(
  daemonController: DaemonController,
  sessionId: string,
  timeoutMs = 30_000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = await daemonController.getStatus(sessionId);
    if (status?.ready) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Daemon ${sessionId} did not become ready within ${timeoutMs}ms`
  );
}

async function captureScreenshot(
  daemonController: DaemonController,
  sessionId: string
): Promise<Screenshot | undefined> {
  const result = await daemonController.executeCommand<ScreenshotData>(
    sessionId,
    {
      id: `screenshot-${Date.now()}`,
      action: "screenshot",
    }
  );

  if (!(result.success && result.data?.base64)) {
    return undefined;
  }

  return {
    data: result.data.base64,
    encoding: "base64",
    format: "png",
  };
}

function recordTraceStep(
  trace: ExecutionStep[],
  action: string,
  params?: Record<string, unknown>,
  error?: string
): void {
  trace.push({
    action,
    params,
    error,
    timestamp: new Date().toISOString(),
  });
}

async function cleanupDaemon(
  daemonController: DaemonController,
  sessionId: string
): Promise<void> {
  try {
    await daemonController.stop(sessionId);
  } catch (stopError) {
    console.warn(
      `[BrowserTask] Failed to stop daemon ${sessionId}:`,
      stopError
    );
  }
}

export interface ExecuteBrowserTaskParams {
  objective: string;
  startUrl?: string;
  context: BrowserAgentContext;
}

export async function executeBrowserTask(
  params: ExecuteBrowserTaskParams
): Promise<BrowserTaskResult> {
  const { objective, startUrl, context } = params;
  const { daemonController } = context;

  const sessionId = generateSessionId();
  const trace: ExecutionStep[] = [];

  try {
    recordTraceStep(trace, "startDaemon", { sessionId, startUrl });
    await daemonController.start(sessionId, startUrl);

    recordTraceStep(trace, "waitForReady", { sessionId });
    await waitForDaemonReady(daemonController, sessionId);

    const loopResult = await runAgentLoop({
      sessionId,
      objective,
      context,
      trace,
      maxSteps: 15,
    });

    const screenshot = await captureScreenshot(daemonController, sessionId);

    return {
      success: true,
      summary: loopResult.summary,
      screenshot,
      trace,
      stepsExecuted: trace.length,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    recordTraceStep(trace, "error", undefined, errorMessage);

    let screenshot: Screenshot | undefined;
    try {
      screenshot = await captureScreenshot(daemonController, sessionId);
    } catch {
      // Ignore screenshot errors during error handling
    }

    return {
      success: false,
      error: errorMessage,
      screenshot,
      trace,
      stepsExecuted: trace.length,
    };
  } finally {
    await cleanupDaemon(daemonController, sessionId);
  }
}
