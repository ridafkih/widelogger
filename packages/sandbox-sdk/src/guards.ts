import { VALID_CONTAINER_STATES } from "./constants";
import { SandboxError } from "./error";
import type { ContainerState } from "./types/container";

export function isContainerState(value: string): value is ContainerState {
  const validContainerStates: readonly string[] = VALID_CONTAINER_STATES;

  return typeof value === "string" && validContainerStates.includes(value);
}

export function isSandboxError(error: unknown): error is SandboxError {
  return error instanceof SandboxError;
}
