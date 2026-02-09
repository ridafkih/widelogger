export interface NetworkCreateOptions {
  driver?: string;
  labels?: Record<string, string>;
}

export interface NetworkManager {
  createNetwork(name: string, options?: NetworkCreateOptions): Promise<void>;
  removeNetwork(name: string): Promise<void>;
  connectContainer(containerName: string, networkName: string): Promise<void>;
  disconnectContainer(
    containerName: string,
    networkName: string
  ): Promise<void>;
  isContainerConnected(
    containerName: string,
    networkName: string
  ): Promise<boolean>;
}
