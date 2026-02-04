import { z } from "zod";
import { tool } from "ai";
import { opencode } from "../../../clients/opencode";
import { findSessionById } from "../../repositories/session.repository";
import { resolveWorkspacePathBySession } from "../../workspace/resolve-path";

interface MessagePart {
  type: string;
  text?: string;
}

interface OpencodeMessage {
  info: { role: "user" | "assistant" };
  parts: MessagePart[];
}

function isMessagePart(value: unknown): value is MessagePart {
  return (
    typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"
  );
}

function isOpencodeMessage(value: unknown): value is OpencodeMessage {
  if (typeof value !== "object" || value === null) return false;
  if (!("info" in value) || !("parts" in value)) return false;

  const info = value.info;
  if (typeof info !== "object" || info === null) return false;
  if (!("role" in info)) return false;
  if (info.role !== "user" && info.role !== "assistant") return false;

  const parts = value.parts;
  if (!Array.isArray(parts)) return false;

  return parts.every(isMessagePart);
}

function extractTextFromParts(parts: MessagePart[]): string {
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .filter((text): text is string => text !== undefined)
    .join("\n");
}

const inputSchema = z.object({
  sessionId: z.string().describe("The session ID to get messages from"),
  limit: z
    .number()
    .optional()
    .default(20)
    .describe("Maximum number of messages to return (most recent first)"),
});

export const getSessionMessagesTool = tool({
  description:
    "Gets conversation messages from a session. Returns messages in reverse chronological order (most recent first) with role and content.",
  inputSchema,
  execute: async ({ sessionId, limit }) => {
    const session = await findSessionById(sessionId);

    if (!session) {
      return { error: "Session not found", messages: [] };
    }

    if (!session.opencodeSessionId) {
      return { error: "Session has no conversation history yet", messages: [] };
    }

    try {
      const directory = await resolveWorkspacePathBySession(sessionId);
      const response = await opencode.session.messages({
        sessionID: session.opencodeSessionId,
        directory,
        limit: limit ?? 20,
      });

      const rawMessages = response.data ?? [];
      const messages = Array.isArray(rawMessages) ? rawMessages.filter(isOpencodeMessage) : [];

      return {
        messages: messages.map((msg) => ({
          role: msg.info.role,
          content: extractTextFromParts(msg.parts),
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { error: `Failed to fetch messages: ${message}`, messages: [] };
    }
  },
});
