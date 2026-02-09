export type MessageAttachment =
  | {
      type: "image";
      data: string;
      encoding: "base64";
      format: string;
    }
  | {
      type: "image_url";
      url: string;
      width?: number;
      height?: number;
    };

export interface SessionInfo {
  sessionId?: string;
  projectName?: string;
  wasForwarded?: boolean;
  attachments: MessageAttachment[];
}

function isSessionCreationOutput(
  value: unknown
): value is { sessionId: string; projectName: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "sessionId" in value &&
    typeof value.sessionId === "string" &&
    "projectName" in value &&
    typeof value.projectName === "string"
  );
}

function isMessageForwardedOutput(
  value: unknown
): value is { success: boolean; sessionId: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "success" in value &&
    value.success === true &&
    "sessionId" in value &&
    typeof value.sessionId === "string"
  );
}

interface ScreenshotUrlOutput {
  hasScreenshot: true;
  screenshotUrl: string;
  width?: number;
  height?: number;
}

function isScreenshotUrlOutput(value: unknown): value is ScreenshotUrlOutput {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("hasScreenshot" in value) || value.hasScreenshot !== true) {
    return false;
  }
  return "screenshotUrl" in value && typeof value.screenshotUrl === "string";
}

interface BrowserTaskUrlOutput {
  success: boolean;
  hasScreenshot: true;
  screenshotUrl: string;
  screenshotWidth?: number;
  screenshotHeight?: number;
}

function isBrowserTaskUrlOutput(value: unknown): value is BrowserTaskUrlOutput {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("success" in value)) {
    return false;
  }
  if (!("hasScreenshot" in value) || value.hasScreenshot !== true) {
    return false;
  }
  return "screenshotUrl" in value && typeof value.screenshotUrl === "string";
}

export function extractSessionInfoFromSteps<
  T extends { toolResults?: Array<{ output: unknown }> },
>(steps: T[]): SessionInfo {
  const attachments: MessageAttachment[] = [];
  let sessionId: string | undefined;
  let projectName: string | undefined;
  let wasForwarded: boolean | undefined;

  for (const step of steps) {
    if (!step.toolResults) {
      continue;
    }

    for (const toolResult of step.toolResults) {
      if (isSessionCreationOutput(toolResult.output)) {
        sessionId = toolResult.output.sessionId;
        projectName = toolResult.output.projectName;
        wasForwarded = false;
      }

      if (isMessageForwardedOutput(toolResult.output)) {
        sessionId = toolResult.output.sessionId;
        wasForwarded = true;
      }

      if (isScreenshotUrlOutput(toolResult.output)) {
        attachments.push({
          type: "image_url",
          url: toolResult.output.screenshotUrl,
          width: toolResult.output.width,
          height: toolResult.output.height,
        });
      }

      if (isBrowserTaskUrlOutput(toolResult.output)) {
        attachments.push({
          type: "image_url",
          url: toolResult.output.screenshotUrl,
          width: toolResult.output.screenshotWidth,
          height: toolResult.output.screenshotHeight,
        });
      }
    }
  }

  return { sessionId, projectName, wasForwarded, attachments };
}
