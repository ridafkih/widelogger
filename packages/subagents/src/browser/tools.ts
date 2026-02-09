import { tool } from "ai";
import { z } from "zod";
import type { ExecutionStep } from "../types";
import type {
  BrowserAgentContext,
  ContentData,
  NavigateData,
  RecordingStopData,
  ScreenshotData,
  SnapshotData,
} from "./types";

function createCommandId(): string {
  return `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const navigateSchema = z.object({
  url: z.string().describe("The URL to navigate to"),
});

const clickSchema = z.object({
  selector: z.string().describe("CSS selector of the element to click"),
});

const clickTextSchema = z.object({
  text: z.string().describe("The text content to find and click"),
  exact: z
    .boolean()
    .optional()
    .describe("Whether to match exactly (default: false)"),
});

const typeSchema = z.object({
  selector: z.string().describe("CSS selector of the input element"),
  text: z.string().describe("The text to type"),
  clear: z
    .boolean()
    .optional()
    .describe("Clear existing text first (default: false)"),
});

const fillSchema = z.object({
  selector: z.string().describe("CSS selector of the input element"),
  value: z.string().describe("The value to fill"),
});

const emptySchema = z.object({});

const selectorSchema = z.object({
  selector: z
    .string()
    .optional()
    .describe("CSS selector (optional, defaults to entire page)"),
});

const requiredSelectorSchema = z.object({
  selector: z.string().describe("CSS selector of the element"),
});

const waitForSchema = z.object({
  selector: z.string().describe("CSS selector to wait for"),
  timeout: z
    .number()
    .optional()
    .describe("Timeout in milliseconds (default: 5000)"),
});

const scrollSchema = z.object({
  direction: z
    .enum(["up", "down", "left", "right"])
    .describe("Scroll direction"),
  amount: z
    .number()
    .optional()
    .describe("Scroll amount in pixels (default: 300)"),
});

export function createBrowserTools(
  sessionId: string,
  context: BrowserAgentContext,
  trace: ExecutionStep[]
) {
  const { daemonController } = context;

  const logStep = (
    action: string,
    params?: Record<string, unknown>,
    result?: unknown,
    error?: string
  ) => {
    trace.push({
      action,
      params,
      result,
      error,
      timestamp: new Date().toISOString(),
    });
  };

  return {
    navigate: tool({
      description: "Navigate to a URL",
      inputSchema: navigateSchema,
      execute: async ({ url }: z.infer<typeof navigateSchema>) => {
        const result = await daemonController.executeCommand<NavigateData>(
          sessionId,
          {
            id: createCommandId(),
            action: "navigate",
            url,
          }
        );
        logStep("navigate", { url }, result.data, result.error);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return {
          success: true,
          url: result.data?.url,
          title: result.data?.title,
        };
      },
    }),

    click: tool({
      description: "Click an element by CSS selector",
      inputSchema: clickSchema,
      execute: async ({ selector }: z.infer<typeof clickSchema>) => {
        const result = await daemonController.executeCommand(sessionId, {
          id: createCommandId(),
          action: "click",
          selector,
        });
        logStep("click", { selector }, undefined, result.error);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true };
      },
    }),

    clickText: tool({
      description: "Click an element containing the specified text",
      inputSchema: clickTextSchema,
      execute: async ({ text, exact }: z.infer<typeof clickTextSchema>) => {
        const result = await daemonController.executeCommand(sessionId, {
          id: createCommandId(),
          action: "getbytext",
          text,
          exact: exact ?? false,
          subaction: "click",
        });
        logStep("clickText", { text, exact }, undefined, result.error);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true };
      },
    }),

    type: tool({
      description: "Type text into an input element",
      inputSchema: typeSchema,
      execute: async ({
        selector,
        text,
        clear,
      }: z.infer<typeof typeSchema>) => {
        const result = await daemonController.executeCommand(sessionId, {
          id: createCommandId(),
          action: "type",
          selector,
          text,
          clear: clear ?? false,
        });
        logStep(
          "type",
          {
            selector,
            text: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
          },
          undefined,
          result.error
        );
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true };
      },
    }),

    fill: tool({
      description: "Fill an input field with a value (clears existing content)",
      inputSchema: fillSchema,
      execute: async ({ selector, value }: z.infer<typeof fillSchema>) => {
        const result = await daemonController.executeCommand(sessionId, {
          id: createCommandId(),
          action: "fill",
          selector,
          value,
        });
        logStep(
          "fill",
          {
            selector,
            value: value.slice(0, 50) + (value.length > 50 ? "..." : ""),
          },
          undefined,
          result.error
        );
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true };
      },
    }),

    screenshot: tool({
      description: "Capture a screenshot of the current page",
      inputSchema: emptySchema,
      execute: async () => {
        const result = await daemonController.executeCommand<ScreenshotData>(
          sessionId,
          {
            id: createCommandId(),
            action: "screenshot",
          }
        );
        logStep(
          "screenshot",
          undefined,
          result.success ? "captured" : undefined,
          result.error
        );
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true, captured: true };
      },
    }),

    getContent: tool({
      description: "Get the HTML content of the page or a specific element",
      inputSchema: selectorSchema,
      execute: async ({ selector }: z.infer<typeof selectorSchema>) => {
        const result = await daemonController.executeCommand<ContentData>(
          sessionId,
          {
            id: createCommandId(),
            action: "content",
            selector,
          }
        );
        logStep(
          "getContent",
          { selector },
          result.success ? "retrieved" : undefined,
          result.error
        );
        if (!result.success) {
          return { success: false, error: result.error };
        }
        const html = result.data?.html ?? "";
        const truncated =
          html.length > 5000 ? `${html.slice(0, 5000)}\n... (truncated)` : html;
        return { success: true, html: truncated };
      },
    }),

    getSnapshot: tool({
      description:
        "Get an accessibility snapshot of the page structure (useful for understanding the page)",
      inputSchema: emptySchema,
      execute: async () => {
        const result = await daemonController.executeCommand<SnapshotData>(
          sessionId,
          {
            id: createCommandId(),
            action: "snapshot",
          }
        );
        logStep(
          "getSnapshot",
          undefined,
          result.success ? "retrieved" : undefined,
          result.error
        );
        if (!result.success) {
          return { success: false, error: result.error };
        }
        const snapshot = result.data?.snapshot ?? "";
        const truncated =
          snapshot.length > 10_000
            ? `${snapshot.slice(0, 10_000)}\n... (truncated)`
            : snapshot;
        return { success: true, snapshot: truncated };
      },
    }),

    getText: tool({
      description: "Get the text content of an element",
      inputSchema: requiredSelectorSchema,
      execute: async ({ selector }: z.infer<typeof requiredSelectorSchema>) => {
        const result = await daemonController.executeCommand<{ text: string }>(
          sessionId,
          {
            id: createCommandId(),
            action: "innertext",
            selector,
          }
        );
        logStep(
          "getText",
          { selector },
          result.data?.text?.slice(0, 100),
          result.error
        );
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true, text: result.data?.text };
      },
    }),

    waitFor: tool({
      description: "Wait for an element to appear on the page",
      inputSchema: waitForSchema,
      execute: async ({ selector, timeout }: z.infer<typeof waitForSchema>) => {
        const result = await daemonController.executeCommand(sessionId, {
          id: createCommandId(),
          action: "wait",
          selector,
          timeout: timeout ?? 5000,
        });
        logStep(
          "waitFor",
          { selector, timeout },
          result.success ? "found" : undefined,
          result.error
        );
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true };
      },
    }),

    scroll: tool({
      description: "Scroll the page",
      inputSchema: scrollSchema,
      execute: async ({ direction, amount }: z.infer<typeof scrollSchema>) => {
        const result = await daemonController.executeCommand(sessionId, {
          id: createCommandId(),
          action: "scroll",
          direction,
          amount: amount ?? 300,
        });
        logStep("scroll", { direction, amount }, undefined, result.error);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true };
      },
    }),

    getCurrentUrl: tool({
      description: "Get the current page URL",
      inputSchema: emptySchema,
      execute: async () => {
        const result = await daemonController.executeCommand<{ url: string }>(
          sessionId,
          {
            id: createCommandId(),
            action: "url",
          }
        );
        logStep("getCurrentUrl", undefined, result.data?.url, result.error);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true, url: result.data?.url };
      },
    }),

    getPageTitle: tool({
      description: "Get the current page title",
      inputSchema: emptySchema,
      execute: async () => {
        const result = await daemonController.executeCommand<{ title: string }>(
          sessionId,
          {
            id: createCommandId(),
            action: "title",
          }
        );
        logStep("getPageTitle", undefined, result.data?.title, result.error);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true, title: result.data?.title };
      },
    }),

    hover: tool({
      description: "Hover over an element",
      inputSchema: requiredSelectorSchema,
      execute: async ({ selector }: z.infer<typeof requiredSelectorSchema>) => {
        const result = await daemonController.executeCommand(sessionId, {
          id: createCommandId(),
          action: "hover",
          selector,
        });
        logStep("hover", { selector }, undefined, result.error);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true };
      },
    }),

    back: tool({
      description: "Go back in browser history",
      inputSchema: emptySchema,
      execute: async () => {
        const result = await daemonController.executeCommand(sessionId, {
          id: createCommandId(),
          action: "back",
        });
        logStep("back", undefined, undefined, result.error);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true };
      },
    }),

    forward: tool({
      description: "Go forward in browser history",
      inputSchema: emptySchema,
      execute: async () => {
        const result = await daemonController.executeCommand(sessionId, {
          id: createCommandId(),
          action: "forward",
        });
        logStep("forward", undefined, undefined, result.error);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true };
      },
    }),

    startRecording: tool({
      description:
        "Start recording the browser session as a video. Note: Recording requires a fresh browser context which may clear cookies/storage state. Default timeout is 60 seconds (max 5 minutes).",
      inputSchema: z.object({
        url: z
          .string()
          .optional()
          .describe("Optional URL to navigate to before recording starts"),
        timeout: z
          .number()
          .optional()
          .describe(
            "Recording timeout in milliseconds. Default: 60000 (60s). Max: 300000 (5 min). Increase for longer recordings, decrease for quick captures."
          ),
      }),
      execute: async ({ url, timeout }: { url?: string; timeout?: number }) => {
        const maxTimeout = 5 * 60 * 1000; // 5 minutes
        const clampedTimeout = Math.min(
          Math.max(timeout ?? 60_000, 1000),
          maxTimeout
        );

        const result = await daemonController.executeCommand(sessionId, {
          id: createCommandId(),
          action: "recording_start",
          url,
          timeout: clampedTimeout,
        });
        logStep(
          "startRecording",
          { url, timeout: clampedTimeout },
          undefined,
          result.error
        );
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return {
          success: true,
          message: `Recording started. Will auto-stop after ${clampedTimeout / 1000} seconds if not stopped manually.`,
        };
      },
    }),

    stopRecording: tool({
      description: "Stop recording and save the video",
      inputSchema: emptySchema,
      execute: async () => {
        const result = await daemonController.executeCommand<RecordingStopData>(
          sessionId,
          {
            id: createCommandId(),
            action: "recording_stop",
          }
        );
        logStep(
          "stopRecording",
          undefined,
          result.data?.frames ? `${result.data.frames} frames` : undefined,
          result.error
        );
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return {
          success: true,
          frames: result.data?.frames,
          path: result.data?.path,
        };
      },
    }),
  };
}
