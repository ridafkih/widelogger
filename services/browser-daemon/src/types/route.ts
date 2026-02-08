import type { RouteHandler as BaseRouteHandler } from "@lab/router";
import type { widelogger } from "@lab/widelogger";
import type { DaemonManager } from "./daemon";

export type Widelog = ReturnType<typeof widelogger>["widelog"];

export interface RouteContext {
  daemonManager: DaemonManager;
  widelog: Widelog;
}

export type RouteHandler = BaseRouteHandler<RouteContext>;
