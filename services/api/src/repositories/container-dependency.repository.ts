import { db } from "@lab/database/client";
import {
  type ContainerDependency,
  containerDependencies,
} from "@lab/database/schema/container-dependencies";
import type { Container } from "@lab/database/schema/containers";
import { inArray } from "drizzle-orm";
import { groupBy } from "../shared/collection-utils";
import { findContainersByProjectId } from "./container-definition.repository";

export interface ContainerWithDependencies extends Container {
  dependencies: { dependsOnContainerId: string; condition: string }[];
}

async function fetchDependenciesForContainers(
  containerIds: string[]
): Promise<ContainerDependency[]> {
  return db
    .select()
    .from(containerDependencies)
    .where(inArray(containerDependencies.containerId, containerIds));
}

export async function findContainersWithDependencies(
  projectId: string
): Promise<ContainerWithDependencies[]> {
  const projectContainers = await findContainersByProjectId(projectId);

  if (projectContainers.length === 0) {
    return [];
  }

  const containerIds = projectContainers.map((container) => container.id);
  const dependencies = await fetchDependenciesForContainers(containerIds);
  const dependenciesByContainerId = groupBy(
    dependencies,
    ({ containerId }) => containerId
  );

  return projectContainers.map((container) => ({
    ...container,
    dependencies: (dependenciesByContainerId.get(container.id) ?? []).map(
      (dep) => ({
        dependsOnContainerId: dep.dependsOnContainerId,
        condition: dep.condition,
      })
    ),
  }));
}

function checkSelfDependency(
  containerId: string,
  dependsOnIds: string[]
): string | null {
  if (dependsOnIds.includes(containerId)) {
    return "Container cannot depend on itself";
  }
  return null;
}

function findMissingDependencies(
  dependsOnIds: string[],
  projectContainerIds: Set<string>
): string[] {
  const errors: string[] = [];
  for (const depId of dependsOnIds) {
    if (!projectContainerIds.has(depId)) {
      errors.push(`Dependency container ${depId} does not exist in project`);
    }
  }
  return errors;
}

export async function validateDependencies(
  projectId: string,
  containerId: string,
  dependsOnIds: string[]
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  const selfDependencyError = checkSelfDependency(containerId, dependsOnIds);
  if (selfDependencyError) {
    errors.push(selfDependencyError);
  }

  if (dependsOnIds.length === 0) {
    return { valid: errors.length === 0, errors };
  }

  const projectContainers = await findContainersByProjectId(projectId);
  const projectContainerIds = new Set(
    projectContainers.map((container) => container.id)
  );
  const missingErrors = findMissingDependencies(
    dependsOnIds,
    projectContainerIds
  );
  errors.push(...missingErrors);

  return { valid: errors.length === 0, errors };
}
