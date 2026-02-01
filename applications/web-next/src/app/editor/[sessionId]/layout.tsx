"use client";

import type { ReactNode } from "react";
import { use } from "react";
import useSWR, { useSWRConfig } from "swr";
import { BrowserStreamProvider } from "@/components/browser-stream";
import { useProjects } from "@/lib/hooks";
import { fetchChannelSnapshot } from "@/lib/api";
import { useMultiplayer } from "@/lib/multiplayer";
import type { Session, Project } from "@lab/client";

type SessionContainer = {
  id: string;
  name: string;
  status: "running" | "stopped" | "starting" | "error";
  urls: { port: number; url: string }[];
};

function isCachedArray<T>(value: unknown): value is { data: T[] } {
  return (
    typeof value === "object" && value !== null && "data" in value && Array.isArray(value.data)
  );
}

function useSessionData(sessionId: string) {
  const { data: projects } = useProjects();
  const { cache } = useSWRConfig();

  if (!projects) {
    return { data: null };
  }

  for (const project of projects) {
    const cached = cache.get(`sessions-${project.id}`);
    if (!isCachedArray<Session>(cached)) continue;

    const session = cached.data.find((existing) => existing.id === sessionId);
    if (session) {
      return { data: { project, session } };
    }
  }

  return { data: null };
}

function useSessionContainers(sessionId: string) {
  const { data: initialContainers } = useSWR(`sessionContainers-${sessionId}`, () =>
    fetchChannelSnapshot<SessionContainer[]>("sessionContainers", sessionId),
  );

  const { useChannel } = useMultiplayer();
  const liveContainers = useChannel("sessionContainers", { uuid: sessionId });

  return liveContainers.length > 0 ? liveContainers : (initialContainers ?? []);
}

type SessionLayoutProps = {
  children: ReactNode;
  params: Promise<{ sessionId: string }>;
};

export default function SessionLayout({ children, params }: SessionLayoutProps) {
  const { sessionId } = use(params);
  const { data: sessionData } = useSessionData(sessionId);
  const containers = useSessionContainers(sessionId);

  const containerUrls = containers.flatMap((container) => container.urls.map(({ url }) => url));

  return (
    <BrowserStreamProvider sessionId={sessionId}>
      <SessionContext.Provider
        value={{
          sessionId,
          session: sessionData?.session ?? null,
          project: sessionData?.project ?? null,
          containers,
          containerUrls,
        }}
      >
        {children}
      </SessionContext.Provider>
    </BrowserStreamProvider>
  );
}

// Context for session data
import { createContext, useContext } from "react";

type SessionContextValue = {
  sessionId: string;
  session: Session | null;
  project: Project | null;
  containers: SessionContainer[];
  containerUrls: string[];
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionContext must be used within SessionLayout");
  }
  return context;
}

export type { SessionContainer };
