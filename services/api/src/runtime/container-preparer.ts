import { type ContainerNode, resolveStartOrder } from "@lab/sandbox-sdk";
import type { ContainerWithDependencies } from "../repositories/container-dependency.repository";
import { findEnvVarsByContainerId } from "../repositories/container-env-var.repository";
import { findPortsByContainerId } from "../repositories/container-port.repository";
import type { Sandbox } from "../types/dependencies";
import { initializeContainerWorkspace } from "./workspace";

export interface PreparedContainer {
  containerDefinition: ContainerWithDependencies;
  ports: { port: number }[];
  envVars: { key: string; value: string }[];
  containerWorkspace: string;
}

export function buildContainerNodes(
  containers: ContainerWithDependencies[]
): ContainerNode[] {
  return containers.map((container) => ({
    id: container.id,
    dependsOn: container.dependencies.map(
      (dependency) => dependency.dependsOnContainerId
    ),
  }));
}

export async function prepareContainerData(
  sessionId: string,
  containerDefinition: ContainerWithDependencies,
  sandbox: Sandbox
): Promise<PreparedContainer> {
  const [ports, envVars, containerWorkspace] = await Promise.all([
    findPortsByContainerId(containerDefinition.id),
    findEnvVarsByContainerId(containerDefinition.id),
    initializeContainerWorkspace(
      sessionId,
      containerDefinition.id,
      containerDefinition.image,
      sandbox
    ),
  ]);

  return { containerDefinition, ports, envVars, containerWorkspace };
}

export { resolveStartOrder };
