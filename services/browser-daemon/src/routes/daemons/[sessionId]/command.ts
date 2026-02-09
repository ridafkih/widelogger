import * as fs from "node:fs/promises";
import type { Command } from "agent-browser/dist/types.js";
import { z } from "zod";
import { NotFoundError, ServiceUnavailableError } from "../../../shared/errors";
import { parseRequestBody } from "../../../shared/validation";
import type { RouteHandler } from "../../../types/route";

const commandBody = z
  .object({
    id: z.string(),
    action: z.string(),
  })
  .passthrough();

async function transformScreenshotResponse(response: {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}): Promise<typeof response> {
  if (!response.success) {
    return response;
  }
  if (typeof response.data !== "object" || response.data === null) {
    return response;
  }
  if (!("path" in response.data) || typeof response.data.path !== "string") {
    return response;
  }

  try {
    const buffer = await fs.readFile(response.data.path);
    const base64 = buffer.toString("base64");
    return { ...response, data: { base64 } };
  } catch {
    return {
      ...response,
      success: false,
      error: `Failed to read screenshot file: ${response.data.path}`,
    };
  }
}

async function transformRecordingResponse(response: {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}): Promise<typeof response> {
  if (!response.success) {
    return response;
  }
  if (typeof response.data !== "object" || response.data === null) {
    return response;
  }
  if (!("path" in response.data) || typeof response.data.path !== "string") {
    return response;
  }

  const data = response.data as { path: string; frames?: number };

  try {
    const buffer = await fs.readFile(data.path);
    const base64 = buffer.toString("base64");
    return {
      ...response,
      data: {
        path: data.path,
        frames: data.frames,
        base64,
        mimeType: "video/webm",
      },
    };
  } catch {
    return {
      ...response,
      success: false,
      error: `Failed to read recording file: ${data.path}`,
    };
  }
}

export const POST: RouteHandler = async ({
  request,
  params,
  context: { daemonManager, widelog },
}) => {
  const sessionId = params.sessionId!;
  widelog.set("session.id", sessionId);

  const session = daemonManager.getSession(sessionId);
  if (!session) {
    throw new NotFoundError("Daemon session", sessionId);
  }

  if (!daemonManager.isReady(sessionId)) {
    throw new ServiceUnavailableError("Daemon not ready", "DAEMON_NOT_READY");
  }

  const body = await parseRequestBody(request, commandBody);
  const command = body as unknown as Command;
  widelog.set("command.action", command.action);

  const response = await daemonManager.executeCommand(sessionId, command);

  if (command.action === "screenshot") {
    const transformed = await transformScreenshotResponse(response);
    return Response.json(transformed);
  }

  if (command.action === "recording_stop") {
    const transformed = await transformRecordingResponse(response);
    return Response.json(transformed);
  }

  return Response.json(response);
};
