import { z } from "zod";
import { tool } from "ai";
import { findProjectById } from "../../repositories/project.repository";
import { spawnSession } from "../session-spawner";
import { initiateConversation } from "../conversation-initiator";
import type { BrowserService } from "../../browser/browser-service";

export interface CreateSessionToolContext {
  browserService: BrowserService;
  modelId?: string;
}

const inputSchema = z.object({
  projectId: z.string().describe("The project ID to create the session for"),
  taskSummary: z.string().describe("A summary of the task to work on"),
});

export function createCreateSessionTool(context: CreateSessionToolContext) {
  return tool({
    description:
      "Creates a new session for a project and starts working on a task. Use this when the user wants to start a new coding task.",
    inputSchema,
    execute: async ({ projectId, taskSummary }) => {
      const project = await findProjectById(projectId);

      if (!project) {
        return { error: "Project not found", sessionId: null, projectName: null };
      }

      try {
        const { session } = await spawnSession({
          projectId,
          taskSummary,
          browserService: context.browserService,
        });

        await initiateConversation({
          sessionId: session.id,
          task: taskSummary,
          modelId: context.modelId,
        });

        return {
          sessionId: session.id,
          projectName: project.name,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          error: `Failed to create session: ${message}`,
          sessionId: null,
          projectName: null,
        };
      }
    },
  });
}
