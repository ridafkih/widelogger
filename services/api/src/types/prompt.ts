import type { PromptFragment, PromptService } from "@lab/prompts-sdk";

/**
 * Context for rendering prompts in the API service.
 */
export interface PromptContext {
  sessionId: string;
  projectId: string;
  projectSystemPrompt: string | null;
}

export type { PromptFragment, PromptService };
