import type {
  ContainerCreateOptions,
  ContainerInfo,
  ExitResult,
  LogChunk,
} from "./container";

export interface ContainerManager {
  createContainer(options: ContainerCreateOptions): Promise<string>;
  startContainer(id: string): Promise<void>;
  stopContainer(id: string, timeout?: number): Promise<void>;
  removeContainer(id: string, force?: boolean): Promise<void>;
  restartContainer(id: string, timeout?: number): Promise<void>;
  inspectContainer(id: string): Promise<ContainerInfo>;
  waitContainer(id: string): Promise<ExitResult>;
  containerExists(id: string): Promise<boolean>;
  streamLogs(id: string, options?: { tail?: number }): AsyncGenerator<LogChunk>;
}
