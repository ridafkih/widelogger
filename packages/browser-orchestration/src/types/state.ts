import { z } from "zod";
import { type CurrentState, type DesiredState } from "./schema";

export const Action = z.enum([
  "StartDaemon",
  "StopDaemon",
  "WaitForReady",
  "ResetToStopped",
  "NoOp",
]);
export type Action = z.infer<typeof Action>;

const VALID_TRANSITIONS: Record<CurrentState, CurrentState[]> = {
  pending: ["starting", "stopped"],
  stopped: ["starting"],
  starting: ["running", "error", "stopped"],
  running: ["stopping", "error"],
  stopping: ["stopped", "error"],
  error: ["starting", "stopped"],
};

export const isValidTransition = (from: CurrentState, to: CurrentState): boolean => {
  if (from === to) return true;
  const validTargets = VALID_TRANSITIONS[from];
  return validTargets.includes(to);
};

export const computeRequiredAction = (
  desired: DesiredState,
  actual: CurrentState,
): Action => {
  if (desired === "running") {
    switch (actual) {
      case "pending":
        return "WaitForReady";
      case "stopped":
        return "StartDaemon";
      case "starting":
        return "WaitForReady";
      case "running":
        return "NoOp";
      case "stopping":
        return "WaitForReady";
      case "error":
        return "StartDaemon";
    }
  }

  switch (actual) {
    case "pending":
      return "ResetToStopped";
    case "stopped":
      return "NoOp";
    case "starting":
      return "StopDaemon";
    case "running":
      return "StopDaemon";
    case "stopping":
      return "WaitForReady";
    case "error":
      return "ResetToStopped";
  }
};

export const computeNextState = (
  current: CurrentState,
  action: Action,
): CurrentState | null => {
  switch (action) {
    case "StartDaemon":
      if (current === "stopped" || current === "error") return "starting";
      return null;
    case "StopDaemon":
      if (current === "running" || current === "starting") return "stopping";
      return null;
    case "ResetToStopped":
      if (current === "error" || current === "pending") return "stopped";
      return null;
    case "WaitForReady":
    case "NoOp":
      return null;
  }
};
