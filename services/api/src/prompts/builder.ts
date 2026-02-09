import { PromptBuilder as BasePromptBuilder } from "@lab/prompts-sdk";
import type {
  PromptContext,
  PromptFragment,
  PromptService,
} from "../types/prompt";
import { agentContextFragment } from "./fragments/agent-context";
import { projectPromptFragment } from "./fragments/project-prompt";

/**
 * Fluent builder for constructing prompt services in the API.
 */
class PromptBuilder {
  private readonly builder: BasePromptBuilder<PromptContext>;

  private constructor(builder: BasePromptBuilder<PromptContext>) {
    this.builder = builder;
  }

  static empty(): PromptBuilder {
    return new PromptBuilder(BasePromptBuilder.empty<PromptContext>());
  }

  static defaults(): PromptBuilder {
    return new PromptBuilder(
      BasePromptBuilder.from<PromptContext>([
        agentContextFragment,
        projectPromptFragment,
      ])
    );
  }

  withFragment(fragment: PromptFragment): PromptBuilder {
    this.builder.withFragment(fragment);
    return this;
  }

  withProjectPrompt(): PromptBuilder {
    return this.withFragment(projectPromptFragment);
  }

  withSeparator(separator: string): PromptBuilder {
    this.builder.withSeparator(separator);
    return this;
  }

  build(): PromptService {
    return this.builder.build();
  }
}

export function createDefaultPromptService(): PromptService {
  return PromptBuilder.defaults().build();
}
