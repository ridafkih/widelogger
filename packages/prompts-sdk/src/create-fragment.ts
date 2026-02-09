import type { CreateFragmentOptions, PromptFragment } from "./types";

/**
 * Create a prompt fragment from options.
 *
 * @typeParam TContext - The context type used for rendering
 *
 * @example
 * ```ts
 * const greetingFragment = createFragment<MyContext>({
 *   id: "greeting",
 *   name: "Greeting",
 *   priority: 10,
 *   render: (ctx) => `Hello, ${ctx.userName}!`,
 *   shouldInclude: (ctx) => ctx.includeGreeting,
 * });
 * ```
 */
export function createFragment<TContext>(
  options: CreateFragmentOptions<TContext>
): PromptFragment<TContext> {
  return {
    id: options.id,
    name: options.name,
    priority: options.priority,
    render: options.render,
    shouldInclude: options.shouldInclude,
  };
}

/**
 * Create a simple static fragment that always renders the same text.
 *
 * @example
 * ```ts
 * const staticFragment = createStaticFragment({
 *   id: "rules",
 *   name: "Rules",
 *   priority: 0,
 *   content: "Always be helpful and concise.",
 * });
 * ```
 */
export function createStaticFragment<TContext = unknown>(options: {
  id: string;
  name: string;
  priority: number;
  content: string;
}): PromptFragment<TContext> {
  return {
    id: options.id,
    name: options.name,
    priority: options.priority,
    render: () => options.content,
  };
}

/**
 * Create a fragment with template variable substitution.
 *
 * @example
 * ```ts
 * const templateFragment = createTemplateFragment<{ name: string }>({
 *   id: "welcome",
 *   name: "Welcome",
 *   priority: 10,
 *   template: "Welcome, {{name}}!",
 *   variables: (ctx) => ({ name: ctx.name }),
 * });
 * ```
 */
export function createTemplateFragment<TContext>(options: {
  id: string;
  name: string;
  priority: number;
  template: string;
  variables: (context: TContext) => Record<string, string>;
  shouldInclude?: (context: TContext) => boolean;
}): PromptFragment<TContext> {
  return {
    id: options.id,
    name: options.name,
    priority: options.priority,
    render: (context) => {
      const vars = options.variables(context);
      let result = options.template;
      for (const [key, value] of Object.entries(vars)) {
        result = result.replaceAll(`{{${key}}}`, value);
      }
      return result;
    },
    shouldInclude: options.shouldInclude,
  };
}
