import { z } from "zod";

export const DockerClientOptionsSchema = z.object({
  socketPath: z.string().optional(),
  host: z.string().optional(),
  port: z.number().int().positive().optional(),
  protocol: z.enum(["http", "https"]).optional(),
});
export type DockerClientOptions = z.infer<typeof DockerClientOptionsSchema>;

export const DockerContainerEventActionSchema = z.enum([
  "start",
  "stop",
  "die",
  "kill",
  "restart",
  "pause",
  "unpause",
  "oom",
  "health_status",
  "health_status: healthy",
  "health_status: unhealthy",
  "health_status: starting",
]);
export type DockerContainerEventAction = z.infer<
  typeof DockerContainerEventActionSchema
>;

export interface DockerContainerEvent {
  containerId: string;
  action: DockerContainerEventAction;
  attributes: Record<string, string>;
  time: number;
}
