import type {
  ContainerEvent,
  ContainerEventStream,
  ContainerEventStreamOptions,
} from "@lab/sandbox-sdk";
import type Dockerode from "dockerode";

const CONTAINER_EVENT_TYPES: readonly string[] = [
  "start",
  "stop",
  "die",
  "kill",
  "restart",
  "pause",
  "unpause",
  "oom",
  "health_status",
];

export class DockerEventStream implements ContainerEventStream {
  constructor(private readonly docker: Dockerode) {}

  async *streamContainerEvents(
    options?: ContainerEventStreamOptions
  ): AsyncGenerator<ContainerEvent> {
    const filters: Record<string, string[]> = {
      type: ["container"],
      event: [...CONTAINER_EVENT_TYPES],
    };

    if (options?.filters?.label) {
      filters.label = options.filters.label;
    }

    if (options?.filters?.container) {
      filters.container = options.filters.container;
    }

    const eventStream = await this.docker.getEvents({ filters });

    for await (const chunk of eventStream) {
      const rawData =
        typeof chunk === "string" ? chunk : chunk.toString("utf-8");

      for (const line of rawData.split("\n")) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          continue;
        }

        const parsedEvent = this.parseEventLine(trimmedLine);
        if (parsedEvent) {
          yield parsedEvent;
        }
      }
    }
  }

  private parseEventLine(line: string): ContainerEvent | null {
    try {
      const event = JSON.parse(line);

      if (event.Type !== "container") {
        return null;
      }

      return {
        containerId: event.id ?? event.Actor?.ID,
        action: event.Action,
        attributes: event.Actor?.Attributes ?? {},
        time: event.time ?? Math.floor(Date.now() / 1000),
      };
    } catch (parseError) {
      console.error("Failed to parse Docker event:", parseError);
      return null;
    }
  }
}
