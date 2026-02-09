import { db } from "@lab/database/client";
import { containerDependencies } from "@lab/database/schema/container-dependencies";
import { containerPorts } from "@lab/database/schema/container-ports";
import { containers } from "@lab/database/schema/containers";
import { projects } from "@lab/database/schema/projects";
import { eq } from "drizzle-orm";
import { InternalError, orThrow } from "../shared/errors";

export async function findAllProjects() {
  return db.select().from(projects);
}

interface ContainerWithDetails {
  id: string;
  image: string;
  hostname: string | null;
  isWorkspace: boolean;
  ports: number[];
  dependencies: { dependsOnContainerId: string; condition: string }[];
}

export async function findAllProjectsWithContainers() {
  const rows = await db
    .select({
      projectId: projects.id,
      projectName: projects.name,
      projectDescription: projects.description,
      projectSystemPrompt: projects.systemPrompt,
      projectCreatedAt: projects.createdAt,
      projectUpdatedAt: projects.updatedAt,
      containerId: containers.id,
      containerImage: containers.image,
      containerHostname: containers.hostname,
      containerIsWorkspace: containers.isWorkspace,
      port: containerPorts.port,
      dependsOnContainerId: containerDependencies.dependsOnContainerId,
      dependencyCondition: containerDependencies.condition,
    })
    .from(projects)
    .leftJoin(containers, eq(containers.projectId, projects.id))
    .leftJoin(containerPorts, eq(containerPorts.containerId, containers.id))
    .leftJoin(
      containerDependencies,
      eq(containerDependencies.containerId, containers.id)
    );

  const projectsById = new Map<
    string,
    {
      id: string;
      name: string;
      description: string | null;
      systemPrompt: string | null;
      createdAt: Date;
      updatedAt: Date;
      containers: ContainerWithDetails[];
    }
  >();

  const containersById = new Map<string, ContainerWithDetails>();
  const seenContainerPorts = new Set<string>();
  const seenContainerDeps = new Set<string>();

  for (const row of rows) {
    if (!projectsById.has(row.projectId)) {
      projectsById.set(row.projectId, {
        id: row.projectId,
        name: row.projectName,
        description: row.projectDescription,
        systemPrompt: row.projectSystemPrompt,
        createdAt: row.projectCreatedAt,
        updatedAt: row.projectUpdatedAt,
        containers: [],
      });
    }

    if (!row.containerId) {
      continue;
    }

    let container = containersById.get(row.containerId);
    if (!container) {
      container = {
        id: row.containerId,
        image: row.containerImage!,
        hostname: row.containerHostname,
        isWorkspace: row.containerIsWorkspace!,
        ports: [],
        dependencies: [],
      };
      containersById.set(row.containerId, container);
      projectsById.get(row.projectId)?.containers.push(container);
    }

    if (row.port !== null) {
      const portKey = `${row.containerId}:${row.port}`;
      if (!seenContainerPorts.has(portKey)) {
        seenContainerPorts.add(portKey);
        container.ports.push(row.port);
      }
    }

    if (row.dependsOnContainerId) {
      const condition = row.dependencyCondition ?? "service_healthy";
      const depKey = `${row.containerId}:${row.dependsOnContainerId}:${condition}`;
      if (!seenContainerDeps.has(depKey)) {
        seenContainerDeps.add(depKey);
        container.dependencies.push({
          dependsOnContainerId: row.dependsOnContainerId,
          condition,
        });
      }
    }
  }

  return Array.from(projectsById.values());
}

export async function findProjectById(projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));
  return project ?? null;
}

export async function findProjectByIdOrThrow(projectId: string) {
  return orThrow(await findProjectById(projectId), "Project", projectId);
}

export async function findProjectSummaries() {
  return db.select({ id: projects.id, name: projects.name }).from(projects);
}

export async function createProject(data: {
  name: string;
  description?: string;
  systemPrompt?: string;
}) {
  const [project] = await db
    .insert(projects)
    .values({
      name: data.name,
      description: data.description,
      systemPrompt: data.systemPrompt,
    })
    .returning();
  if (!project) {
    throw new InternalError(
      "Failed to create project",
      "PROJECT_CREATE_FAILED"
    );
  }
  return project;
}

export async function deleteProject(projectId: string) {
  await db.delete(projects).where(eq(projects.id, projectId));
}

export async function updateProject(
  projectId: string,
  data: { description?: string; systemPrompt?: string }
) {
  const [project] = await db
    .update(projects)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();
  return project ?? null;
}

export async function getProjectSystemPrompt(projectId: string) {
  const [project] = await db
    .select({ systemPrompt: projects.systemPrompt })
    .from(projects)
    .where(eq(projects.id, projectId));
  return project?.systemPrompt ?? null;
}
