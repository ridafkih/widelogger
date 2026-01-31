import useSWR from "swr";
import { api } from "./api";

export function useProjects() {
  return useSWR("projects", () => api.projects.list());
}

export function useContainers(projectId: string | null) {
  return useSWR(projectId ? `containers-${projectId}` : null, () => {
    if (!projectId) return [];
    return api.containers.list(projectId);
  });
}

export function useSessions(projectId: string | null) {
  return useSWR(projectId ? `sessions-${projectId}` : null, () => {
    if (!projectId) return [];
    return api.sessions.list(projectId);
  });
}

export function useSession(sessionId: string | null) {
  return useSWR(sessionId ? `session-${sessionId}` : null, () => {
    if (!sessionId) return null;
    return api.sessions.get(sessionId);
  });
}
