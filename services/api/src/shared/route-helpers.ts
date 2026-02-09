import type { RouteHandler } from "@lab/router";
import { assertRouteParam } from "@lab/router";

export function withParams<
  TParams extends Record<string, string>,
  TContext = unknown,
>(
  paramKeys: (keyof TParams & string)[],
  handler: (args: {
    params: TParams;
    request: Request;
    context: TContext;
  }) => Response | Promise<Response>
): RouteHandler<TContext> {
  return ({ request, params: rawParams, context }) => {
    const params = {} as Record<string, string>;
    for (const key of paramKeys) {
      params[key] = assertRouteParam(rawParams, key);
    }
    return handler({ params: params as TParams, request, context });
  };
}
