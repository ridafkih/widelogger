import { setTimeout } from "node:timers/promises";
import type { ContainerManager, VolumeManager } from "@lab/sandbox-sdk";
import { SandboxError } from "@lab/sandbox-sdk";
import type Dockerode from "dockerode";
import { ALPINE_IMAGE, VOLUME_CLONE_COMMAND } from "../constants";
import { isNotFoundError } from "../utils/error-handling";

const DEFAULT_CLONE_TIMEOUT_MS = 30_000;

async function throwAfterTimeout(ms: number, message: string): Promise<never> {
  await setTimeout(ms);
  throw new Error(message);
}

export class DockerVolumeManager implements VolumeManager {
  constructor(
    private readonly docker: Dockerode,
    private readonly containerManager: ContainerManager
  ) {}

  async createVolume(
    name: string,
    labels?: Record<string, string>
  ): Promise<void> {
    await this.docker.createVolume({
      Name: name,
      Labels: labels,
    });
  }

  async removeVolume(name: string): Promise<void> {
    try {
      await this.docker.getVolume(name).remove();
    } catch (error) {
      if (isNotFoundError(error)) {
        return;
      }
      throw error;
    }
  }

  async volumeExists(name: string): Promise<boolean> {
    try {
      await this.docker.getVolume(name).inspect();
      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }

      throw error;
    }
  }

  async cloneVolume(
    sourceVolume: string,
    targetVolume: string,
    timeoutMs = DEFAULT_CLONE_TIMEOUT_MS
  ): Promise<void> {
    await this.createVolume(targetVolume);

    const cloneContainerId = await this.containerManager.createContainer({
      image: ALPINE_IMAGE,
      command: VOLUME_CLONE_COMMAND,
      volumes: [
        { source: sourceVolume, target: "/source", readonly: true },
        { source: targetVolume, target: "/target" },
      ],
    });

    try {
      await this.containerManager.startContainer(cloneContainerId);

      const waitResult = await Promise.race([
        this.containerManager.waitContainer(cloneContainerId),
        throwAfterTimeout(
          timeoutMs,
          `Volume clone timed out after ${timeoutMs}ms`
        ),
      ]);

      if (waitResult.exitCode !== 0) {
        await this.removeVolume(targetVolume);
        throw SandboxError.volumeCloneFailed(
          sourceVolume,
          targetVolume,
          `Clone container exited with code ${waitResult.exitCode}`
        );
      }
    } catch (error) {
      await this.removeVolume(targetVolume);
      await this.containerManager.removeContainer(cloneContainerId, true);
      throw error;
    }

    await this.containerManager.removeContainer(cloneContainerId, true);
  }
}
