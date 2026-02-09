import type {
  SandboxProvider,
  WorkspaceManager,
  WorkspaceManagerConfig,
} from "@lab/sandbox-sdk";

export class DockerWorkspaceManager implements WorkspaceManager {
  constructor(
    private readonly client: SandboxProvider,
    private readonly config: WorkspaceManagerConfig
  ) {}

  async startWorkspace(workspacePath: string, image: string): Promise<string> {
    await this.ensureImageAvailable(image);
    const command = await this.getSetupCommand(workspacePath, image);
    await this.populateWorkspace(image, command);
    return workspacePath;
  }

  private async ensureImageAvailable(image: string): Promise<void> {
    const exists = await this.client.imageExists(image);
    if (!exists) {
      await this.client.pullImage(image);
    }
  }

  private async getSetupCommand(
    workspacePath: string,
    image: string
  ): Promise<string> {
    const { workdir } = await this.client.getImageConfig(image);
    const hasWorkdir = workdir && workdir !== "/";

    if (hasWorkdir) {
      return `mkdir -p ${workspacePath} && cp -r ${workdir}/. ${workspacePath}/`;
    }

    return `mkdir -p ${workspacePath}`;
  }

  private async populateWorkspace(
    image: string,
    command: string
  ): Promise<void> {
    const containerId = await this.client.createContainer({
      image,
      command: ["sh", "-c", command],
      volumes: [
        {
          source: this.config.workspacesVolume,
          target: this.config.workspacesMount,
        },
      ],
    });

    await this.client.startContainer(containerId);
    await this.client.waitContainer(containerId);
    await this.client.removeContainer(containerId);
  }
}
