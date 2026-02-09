import { z } from "zod";

export const SandboxErrorKind = z.enum([
  "ContainerNotFound",
  "ContainerNotRunning",
  "ImageNotFound",
  "ImagePullFailed",
  "VolumeNotFound",
  "VolumeCloneFailed",
  "NetworkNotFound",
  "PortAllocationFailed",
  "PortRangeExhausted",
  "ExecFailed",
  "ConnectionFailed",
  "ValidationFailed",
  "Timeout",
]);
export type SandboxErrorKind = z.infer<typeof SandboxErrorKind>;

export class SandboxError extends Error {
  constructor(
    public readonly kind: SandboxErrorKind,
    message: string,
    public readonly resourceId?: string
  ) {
    super(message);
    this.name = "SandboxError";
  }

  static containerNotFound(id: string) {
    return new SandboxError(
      "ContainerNotFound",
      `Container ${id} not found`,
      id
    );
  }

  static containerNotRunning(id: string) {
    return new SandboxError(
      "ContainerNotRunning",
      `Container ${id} is not running`,
      id
    );
  }

  static imageNotFound(ref: string) {
    return new SandboxError("ImageNotFound", `Image ${ref} not found`, ref);
  }

  static imagePullFailed(ref: string, reason: string) {
    return new SandboxError(
      "ImagePullFailed",
      `Failed to pull ${ref}: ${reason}`,
      ref
    );
  }

  static volumeNotFound(name: string) {
    return new SandboxError("VolumeNotFound", `Volume ${name} not found`, name);
  }

  static volumeCloneFailed(source: string, target: string, reason: string) {
    return new SandboxError(
      "VolumeCloneFailed",
      `Failed to clone ${source} to ${target}: ${reason}`,
      source
    );
  }

  static networkNotFound(name: string) {
    return new SandboxError(
      "NetworkNotFound",
      `Network ${name} not found`,
      name
    );
  }

  static portAllocationFailed(reason: string) {
    return new SandboxError("PortAllocationFailed", reason);
  }

  static portRangeExhausted(min: number, max: number) {
    return new SandboxError(
      "PortRangeExhausted",
      `No available ports in range ${min}-${max}`
    );
  }

  static execFailed(containerId: string, reason: string) {
    return new SandboxError("ExecFailed", reason, containerId);
  }

  static validationFailed(message: string) {
    return new SandboxError("ValidationFailed", message);
  }

  static timeout(operation: string, resourceId?: string) {
    return new SandboxError("Timeout", `${operation} timed out`, resourceId);
  }
}
