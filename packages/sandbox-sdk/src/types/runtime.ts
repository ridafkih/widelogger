export interface RuntimeContainerStartInput {
  sessionId: string;
  projectId: string;
  containerId: string;
  image: string;
  networkId: string;
  hostname: string;
  workdir: string;
  env?: Record<string, string>;
  ports?: number[];
  aliases?: string[];
}

export interface RuntimeContainerStartResult {
  runtimeId: string;
}

export interface RuntimeManager {
  startContainer(
    input: RuntimeContainerStartInput
  ): Promise<RuntimeContainerStartResult>;
}
