import type { Project } from "@lab/database/schema/projects";
import { z } from "zod";
import { NotFoundError, ValidationError } from "../shared/errors";
import { complete } from "./llm";
import { buildProjectResolutionPrompt } from "./prompts";

const resolutionResponseSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string(),
});

export type ProjectResolutionResult = z.infer<typeof resolutionResponseSchema>;

interface ProjectInfo {
  id: string;
  name: string;
  description: string | null;
}

function formatProjectContext(projects: ProjectInfo[]): string {
  return projects
    .map((project, index) => {
      const description = project.description
        ? `\n   ${project.description}`
        : "";
      return `${index + 1}. "${project.name}" (ID: ${project.id})${description}`;
    })
    .join("\n\n");
}

function extractJsonFromResponse(response: string): string {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new ValidationError("Failed to parse LLM response: no JSON found");
  }
  return jsonMatch[0];
}

function parseResolutionResponse(response: string): ProjectResolutionResult {
  const jsonString = extractJsonFromResponse(response);

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(jsonString);
  } catch {
    throw new ValidationError("Failed to parse LLM response: invalid JSON");
  }

  const parseResult = resolutionResponseSchema.safeParse(rawJson);
  if (!parseResult.success) {
    throw new ValidationError(
      `Failed to parse LLM response: ${parseResult.error.message}`
    );
  }

  return parseResult.data;
}

function findProjectById(
  projects: Project[],
  projectId: string
): Project | undefined {
  return projects.find((project) => project.id === projectId);
}

function findProjectByName(
  projects: Project[],
  projectName: string
): Project | undefined {
  return projects.find(
    (project) => project.name.toLowerCase() === projectName.toLowerCase()
  );
}

function validateProjectExists(
  result: ProjectResolutionResult,
  projects: Project[]
): ProjectResolutionResult {
  const matchedById = findProjectById(projects, result.projectId);
  if (matchedById) {
    return result;
  }

  const matchedByName = findProjectByName(projects, result.projectName);
  if (matchedByName) {
    return {
      ...result,
      projectId: matchedByName.id,
      projectName: matchedByName.name,
    };
  }

  throw new NotFoundError(
    "Resolved project",
    `${result.projectName} (${result.projectId})`
  );
}

function resolveSingleProject(project: Project): ProjectResolutionResult {
  return {
    projectId: project.id,
    projectName: project.name,
    confidence: "high",
    reasoning: "Only one project available",
  };
}

export async function resolveProject(
  task: string,
  projects: Project[]
): Promise<ProjectResolutionResult> {
  const firstProject = projects[0];
  if (!firstProject) {
    throw new NotFoundError("Project");
  }

  if (projects.length === 1) {
    return resolveSingleProject(firstProject);
  }

  const projectInfos: ProjectInfo[] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
  }));

  const projectContext = formatProjectContext(projectInfos);
  const prompt = buildProjectResolutionPrompt(task, projectContext);

  const llmResponse = await complete(prompt);
  const result = parseResolutionResponse(llmResponse);

  return validateProjectExists(result, projects);
}
