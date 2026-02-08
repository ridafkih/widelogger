import type { RouteHandler } from "@lab/router";
import type {
  BrowserContext,
  SessionContext,
  InfraContext,
  MonitorContext,
  GithubContext,
  ProxyContext,
  PromptContext,
} from "./contexts";

export type { BrowserContext, InfraContext, GithubContext, ProxyContext } from "./contexts";

interface RouteContextMap {
  browser: BrowserContext;
  session: SessionContext;
  infra: InfraContext;
  monitor: MonitorContext;
  github: GithubContext;
  proxy: ProxyContext;
  prompt: PromptContext;
}

type UnionToIntersection<T> = (T extends unknown ? (value: T) => void : never) extends (
  value: infer R,
) => void
  ? R
  : never;

export interface RouteContext
  extends
    BrowserContext,
    SessionContext,
    InfraContext,
    MonitorContext,
    GithubContext,
    ProxyContext,
    PromptContext {}

export type ContextKey = keyof RouteContextMap;
export type RouteContextFor<TKeys extends ContextKey> = UnionToIntersection<RouteContextMap[TKeys]>;
export type NoRouteContext = Record<string, never>;

export type Handler<TContext> = RouteHandler<TContext>;
