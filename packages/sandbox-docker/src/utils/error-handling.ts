import { SandboxError } from "@lab/sandbox-sdk";

export function hasStatusCode(err: unknown): err is { statusCode: number } {
  return typeof err === "object" && err !== null && "statusCode" in err;
}

export function isNotFoundError(err: unknown): boolean {
  return hasStatusCode(err) && err.statusCode === 404;
}

export function isNotRunningError(err: unknown): boolean {
  return hasStatusCode(err) && err.statusCode === 304;
}

export function wrapDockerError(
  err: unknown,
  operation: "container" | "volume" | "network" | "image",
  resourceId: string
): SandboxError {
  if (isNotFoundError(err)) {
    switch (operation) {
      case "container":
        return SandboxError.containerNotFound(resourceId);
      case "volume":
        return SandboxError.volumeNotFound(resourceId);
      case "network":
        return SandboxError.networkNotFound(resourceId);
      case "image":
        return SandboxError.imageNotFound(resourceId);
    }
  }
  return SandboxError.execFailed(resourceId, String(err));
}
