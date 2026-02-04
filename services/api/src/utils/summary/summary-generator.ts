import { complete } from "../orchestration/llm";
import { opencode } from "../../clients/opencode";
import { findSessionById } from "../repositories/session.repository";
import { resolveWorkspacePathBySession } from "../workspace/resolve-path";

export interface TaskSummary {
  success: boolean;
  outcome: string;
  summary: string;
}

export interface GenerateSummaryOptions {
  sessionId: string;
  originalTask: string;
  platformOrigin?: string;
}

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

function formatConversationForLLM(messages: OpencodeMessage[]): string {
  return messages
    .map((msg) => {
      const role = msg.info.role === "user" ? "User" : "Assistant";
      const text = extractTextFromParts(msg.parts);
      return `${role}: ${text}`;
    })
    .join("\n\n");
}

const platformFormatGuidelines: Record<string, string> = {
  imessage:
    "Keep the summary very short (under 200 characters), use plain text only, no markdown or formatting.",
  slack: "You may use Slack mrkdwn: *bold*, _italic_. Keep it concise but informative.",
  discord: "You may use Discord markdown: **bold**, *italic*. Keep under 500 characters.",
};

function getPlatformGuideline(platform?: string): string {
  if (!platform) return "Keep the summary concise and use plain text.";
  return (
    platformFormatGuidelines[platform.toLowerCase()] ??
    "Keep the summary concise and use plain text."
  );
}

export async function generateTaskSummary(options: GenerateSummaryOptions): Promise<TaskSummary> {
  const { sessionId, originalTask, platformOrigin } = options;
  const session = await findSessionById(sessionId);

  if (!session?.opencodeSessionId) {
    return {
      success: false,
      outcome: "Session not found",
      summary: "Unable to generate summary - session not found.",
    };
  }

  try {
    const directory = await resolveWorkspacePathBySession(sessionId);
    const response = await opencode.session.messages({
      sessionID: session.opencodeSessionId,
      directory,
    });

    const rawMessages = response.data ?? [];
    const messages = Array.isArray(rawMessages) ? rawMessages.filter(isOpencodeMessage) : [];

    if (messages.length === 0) {
      return {
        success: false,
        outcome: "No conversation history",
        summary: "Unable to generate summary - no conversation history found.",
      };
    }

    const conversationText = formatConversationForLLM(messages);
    const formatGuideline = getPlatformGuideline(platformOrigin);

    const prompt = `You are summarizing the outcome of a task that was delegated to an AI assistant.

Original Task:
${originalTask}

Conversation:
${conversationText}

Based on the conversation above, provide a brief summary of:
1. Whether the task was completed successfully
2. What was accomplished
3. Any issues or notes worth mentioning

Formatting: ${formatGuideline}

Respond in this exact JSON format:
{
  "success": true/false,
  "outcome": "Brief one-line description of what happened",
  "summary": "1-2 sentence summary suitable for sending as a notification message"
}

Only output the JSON, no other text.`;

    const result = await complete(prompt);

    try {
      const parsed = JSON.parse(result);
      return {
        success: Boolean(parsed.success),
        outcome: String(parsed.outcome || "Task processed"),
        summary: String(parsed.summary || "Task completed."),
      };
    } catch {
      return {
        success: true,
        outcome: "Task completed",
        summary: result.slice(0, 200),
      };
    }
  } catch (error) {
    console.error("[SummaryGenerator] Error generating summary:", error);
    return {
      success: false,
      outcome: "Error generating summary",
      summary: "Task completed, but unable to generate a detailed summary.",
    };
  }
}
