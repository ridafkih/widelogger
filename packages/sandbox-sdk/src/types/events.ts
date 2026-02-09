export type ContainerEventAction =
  | "start"
  | "stop"
  | "die"
  | "kill"
  | "restart"
  | "pause"
  | "unpause"
  | "oom"
  | "health_status"
  | "health_status: healthy"
  | "health_status: unhealthy"
  | "health_status: starting";

export interface ContainerEvent {
  containerId: string;
  action: ContainerEventAction;
  attributes: Record<string, string>;
  time: number;
}

export interface ContainerEventStreamOptions {
  filters?: { label?: string[]; container?: string[] };
}

export interface ContainerEventStream {
  streamContainerEvents(
    options?: ContainerEventStreamOptions
  ): AsyncGenerator<ContainerEvent>;
}
