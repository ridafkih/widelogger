import type { PromptFragment } from "../../types/prompt";
import { createFragment } from "../create-fragment";

export const projectPromptFragment: PromptFragment = createFragment({
  id: "project-prompt",
  name: "Project System Prompt",
  priority: 100,
  render: (context) => context.projectSystemPrompt,
  shouldInclude: (context) =>
    context.projectSystemPrompt !== null &&
    context.projectSystemPrompt.length > 0,
});
