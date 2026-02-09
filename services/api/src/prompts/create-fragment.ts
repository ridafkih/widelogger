import { createFragment as baseCreateFragment } from "@lab/prompts-sdk";
import type { PromptContext, PromptFragment } from "../types/prompt";

interface CreateFragmentOptions {
  id: string;
  name: string;
  /** Lower values appear first in the composed prompt. */
  priority: number;
  render: (context: PromptContext) => string | null;
  shouldInclude?: (context: PromptContext) => boolean;
}

/**
 * Create a prompt fragment for the API service context.
 */
export const createFragment = (
  options: CreateFragmentOptions
): PromptFragment => baseCreateFragment<PromptContext>(options);
