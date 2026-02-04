import { z } from "zod";
import { tool } from "ai";
import { findSessionById } from "../../repositories/session.repository";
import { sendMessageToSession } from "../message-sender";

const inputSchema = z.object({
  sessionId: z.string().describe("The session ID to send the message to"),
  message: z.string().describe("The message content to send to the session"),
});

export interface SendMessageToolContext {
  modelId?: string;
}

export function createSendMessageToSessionTool(context: SendMessageToolContext) {
  return tool({
    description:
      "Sends a message to an existing active session. Use this to forward the user's request or follow-up to a session that is already working on a task.",
    inputSchema,
    execute: async ({ sessionId, message }) => {
      const session = await findSessionById(sessionId);

      if (!session) {
        return { success: false, error: "Session not found" };
      }

      if (!session.opencodeSessionId) {
        return { success: false, error: "Session is not ready yet" };
      }

      try {
        await sendMessageToSession({
          sessionId,
          opencodeSessionId: session.opencodeSessionId,
          content: message,
          modelId: context.modelId,
        });

        return { success: true, sessionId };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    },
  });
}
