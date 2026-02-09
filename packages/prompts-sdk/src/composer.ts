import type {
  PromptCompositionResult,
  PromptFragment,
  PromptService,
} from "./types";

/**
 * Configuration for the PromptComposer.
 */
export interface PromptComposerConfig<TContext> {
  /** Fragments to compose */
  fragments: PromptFragment<TContext>[];
  /** Separator between fragment outputs (default: "\n\n") */
  separator?: string;
}

/**
 * Composes multiple prompt fragments into a single prompt.
 * Fragments are sorted by priority and conditionally included.
 *
 * @typeParam TContext - The context type used for rendering
 */
export class PromptComposer<TContext> implements PromptService<TContext> {
  private readonly fragments: PromptFragment<TContext>[];
  private readonly separator: string;

  constructor(config: PromptComposerConfig<TContext>) {
    // Sort fragments by priority (lower values first)
    this.fragments = [...config.fragments].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
    );
    this.separator = config.separator ?? "\n\n";
  }

  /**
   * Compose all applicable fragments into a single prompt.
   */
  compose(context: TContext): PromptCompositionResult {
    const includedFragments: string[] = [];
    const renderedParts: string[] = [];

    for (const fragment of this.fragments) {
      // Check if fragment should be included
      const shouldInclude = fragment.shouldInclude?.(context) ?? true;
      if (!shouldInclude) {
        continue;
      }

      // Render the fragment
      const rendered = fragment.render(context);
      if (rendered === null || rendered.length === 0) {
        continue;
      }

      includedFragments.push(fragment.id);
      renderedParts.push(rendered);
    }

    return {
      text: renderedParts.join(this.separator),
      includedFragments,
    };
  }
}
