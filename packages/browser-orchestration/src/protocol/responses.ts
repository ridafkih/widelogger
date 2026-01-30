import { z } from "zod";
import { BrowserErrorKind } from "../types/errors";

const BrowserErrorSchema = z.object({
  kind: BrowserErrorKind,
  message: z.string(),
  sessionId: z.string().optional(),
});

export const StartedResponse = z.object({
  type: z.literal("started"),
  sessionId: z.string().uuid(),
  port: z.number().int().positive(),
});
export type StartedResponse = z.infer<typeof StartedResponse>;

export const ReadyResponse = z.object({
  type: z.literal("ready"),
  sessionId: z.string().uuid(),
});
export type ReadyResponse = z.infer<typeof ReadyResponse>;

export const StoppedResponse = z.object({
  type: z.literal("stopped"),
  sessionId: z.string().uuid(),
});
export type StoppedResponse = z.infer<typeof StoppedResponse>;

export const ErrorResponse = z.object({
  type: z.literal("error"),
  sessionId: z.string().uuid().optional(),
  error: BrowserErrorSchema,
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

export const FrameResponse = z.object({
  type: z.literal("frame"),
  data: z.string(),
});
export type FrameResponse = z.infer<typeof FrameResponse>;

export const StatusResponse = z.object({
  type: z.literal("status"),
  sessionId: z.string().uuid(),
  running: z.boolean(),
  ready: z.boolean(),
  port: z.number().int().positive().nullable(),
});
export type StatusResponse = z.infer<typeof StatusResponse>;

export const PongResponse = z.object({
  type: z.literal("pong"),
});
export type PongResponse = z.infer<typeof PongResponse>;

export const UrlResponse = z.object({
  url: z.string().nullable(),
});
export type UrlResponse = z.infer<typeof UrlResponse>;

export const DaemonResponse = z.discriminatedUnion("type", [
  StartedResponse,
  ReadyResponse,
  StoppedResponse,
  ErrorResponse,
  FrameResponse,
  StatusResponse,
  PongResponse,
]);
export type DaemonResponse = z.infer<typeof DaemonResponse>;
