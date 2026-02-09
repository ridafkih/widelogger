import type {
  RestartPolicy,
  RuntimeContainerStartInput,
  RuntimeContainerStartResult,
  RuntimeManager,
  SandboxProvider,
  VolumeBinding,
} from "@lab/sandbox-sdk";

export interface DockerRuntimeManagerConfig {
  workspacesSource: string;
  workspacesTarget: string;
  opencodeAuthSource: string;
  opencodeAuthTarget: string;
  browserSocketSource: string;
  browserSocketTarget: string;
  restartPolicy?: RestartPolicy;
}

const DEFAULT_RESTART_POLICY: RestartPolicy = {
  name: "on-failure",
  maximumRetryCount: 3,
};

export class DockerRuntimeManager implements RuntimeManager {
  constructor(
    private readonly provider: SandboxProvider,
    private readonly config: DockerRuntimeManagerConfig
  ) {}

  async startContainer(
    input: RuntimeContainerStartInput
  ): Promise<RuntimeContainerStartResult> {
    const containerName = this.formatContainerName(
      input.sessionId,
      input.containerId
    );

    const runtimeId = await this.provider.createContainer({
      name: containerName,
      image: input.image,
      hostname: input.hostname,
      networkMode: input.networkId,
      workdir: input.workdir,
      env: input.env,
      ports: (input.ports ?? []).map((port) => ({
        container: port,
        host: undefined,
      })),
      volumes: this.getVolumeBindings(),
      labels: {
        "lab.session": input.sessionId,
        "lab.project": input.projectId,
        "lab.container": input.containerId,
      },
      restartPolicy: this.config.restartPolicy ?? DEFAULT_RESTART_POLICY,
    });

    try {
      await this.provider.startContainer(runtimeId);
    } catch (startError) {
      await this.provider.removeContainer(runtimeId).catch(() => undefined);
      throw startError;
    }

    try {
      const aliases = input.aliases ?? [];
      if (aliases.length > 0) {
        const isConnected = await this.provider.isConnectedToNetwork(
          runtimeId,
          input.networkId
        );
        if (isConnected) {
          await this.provider.disconnectFromNetwork(runtimeId, input.networkId);
        }
        await this.provider.connectToNetwork(runtimeId, input.networkId, {
          aliases,
        });

        const verifyConnected = await this.provider.isConnectedToNetwork(
          runtimeId,
          input.networkId
        );
        if (!verifyConnected) {
          throw new Error(
            `Failed to connect container ${runtimeId} to network ${input.networkId}`
          );
        }
      }
    } catch (networkError) {
      await this.provider
        .removeContainer(runtimeId, true)
        .catch(() => undefined);
      throw networkError;
    }

    return { runtimeId };
  }

  private getVolumeBindings(): VolumeBinding[] {
    return [
      {
        source: this.config.workspacesSource,
        target: this.config.workspacesTarget,
      },
      {
        source: this.config.opencodeAuthSource,
        target: this.config.opencodeAuthTarget,
      },
      {
        source: this.config.browserSocketSource,
        target: this.config.browserSocketTarget,
      },
    ];
  }

  private formatContainerName(sessionId: string, containerId: string): string {
    return `lab-${sessionId}-${containerId}`;
  }
}
