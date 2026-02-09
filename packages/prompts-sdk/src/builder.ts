import { PromptComposer } from "./composer";
import type { PromptFragment, PromptService } from "./types";

/**
 * Fluent builder for constructing a PromptService.
 *
 * @typeParam TContext - The context type used for rendering
 *
 * @example
 * ```ts
 * const service = PromptBuilder.empty<MyContext>()
 *   .withFragment(myFragment)
 *   .withFragment(anotherFragment)
 *   .withSeparator("\n---\n")
 *   .build();
 * ```
 */
export class PromptBuilder<TContext> {
  private readonly fragments: PromptFragment<TContext>[] = [];
  private separator = "\n\n";

  private constructor(fragments: PromptFragment<TContext>[] = []) {
    this.fragments = [...fragments];
  }

  /**
   * Create an empty builder with no fragments.
   */
  static empty<TContext>(): PromptBuilder<TContext> {
    return new PromptBuilder<TContext>();
  }

  /**
   * Create a builder with initial fragments.
   */
  static from<TContext>(
    fragments: PromptFragment<TContext>[]
  ): PromptBuilder<TContext> {
    return new PromptBuilder<TContext>(fragments);
  }

  /**
   * Add a fragment to the builder.
   */
  withFragment(fragment: PromptFragment<TContext>): PromptBuilder<TContext> {
    this.fragments.push(fragment);
    return this;
  }

  /**
   * Add multiple fragments to the builder.
   */
  withFragments(
    fragments: PromptFragment<TContext>[]
  ): PromptBuilder<TContext> {
    this.fragments.push(...fragments);
    return this;
  }

  /**
   * Set the separator between fragment outputs.
   */
  withSeparator(separator: string): PromptBuilder<TContext> {
    this.separator = separator;
    return this;
  }

  /**
   * Build the PromptService.
   */
  build(): PromptService<TContext> {
    return new PromptComposer<TContext>({
      fragments: this.fragments,
      separator: this.separator,
    });
  }
}
