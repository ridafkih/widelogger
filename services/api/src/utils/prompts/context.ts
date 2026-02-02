import type { PromptContext, ServiceRoute } from "../../types/prompt";

export interface ContainerInfo {
  hostname: string;
  port: number;
}

export interface CreatePromptContextParams {
  sessionId: string;
  projectId: string;
  containers: ContainerInfo[];
  projectSystemPrompt: string | null;
}

export function createPromptContext(params: CreatePromptContextParams): PromptContext {
  const serviceRoutes: ServiceRoute[] = params.containers.map((container) => ({
    port: container.port,
    url: `http://${container.hostname}.internal/`,
  }));

  return {
    sessionId: params.sessionId,
    projectId: params.projectId,
    serviceRoutes,
    projectSystemPrompt: params.projectSystemPrompt,
  };
}
