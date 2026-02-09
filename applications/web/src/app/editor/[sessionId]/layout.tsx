"use client";

import type { Project, Session } from "@lab/client";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { use, useEffect } from "react";
import useSWR from "swr";
import { BrowserStreamProvider } from "@/components/browser-stream";
import { SessionInfoView } from "@/components/session-info-view";
import { fetchChannelSnapshot } from "@/lib/api";
import { useDeleteSession, useProjects, useSession } from "@/lib/hooks";
import { useMultiplayer } from "@/lib/multiplayer";

interface SessionContainer {
  id: string;
  name: string;
  status: "running" | "stopped" | "starting" | "error";
  urls: { port: number; url: string }[];
}

function useSessionData(sessionId: string) {
  const { data: projects } = useProjects();
  const { data: session } = useSession(sessionId);

  if (!(projects && session)) {
    return { data: null };
  }

  const project = projects.find(({ id }) => id === session.projectId);
  if (!project) {
    return { data: null };
  }

  return { data: { project, session } };
}

function useSessionContainers(sessionId: string) {
  const { data: initialContainers } = useSWR(
    `sessionContainers-${sessionId}`,
    () =>
      fetchChannelSnapshot<SessionContainer[]>("sessionContainers", sessionId)
  );

  const { useChannel } = useMultiplayer();
  const liveContainers = useChannel("sessionContainers", { uuid: sessionId });

  return liveContainers.length > 0 ? liveContainers : (initialContainers ?? []);
}

interface SessionLayoutProps {
  children: ReactNode;
  params: Promise<{ sessionId: string }>;
}

export default function SessionLayout({
  children,
  params,
}: SessionLayoutProps) {
  const router = useRouter();
  const { sessionId } = use(params);
  const { error: sessionError } = useSession(sessionId);
  const { data: sessionData } = useSessionData(sessionId);
  const containers = useSessionContainers(sessionId);

  const containerUrls = containers.flatMap((container) =>
    container.urls.map(({ url }) => url)
  );

  const contextValue = {
    sessionId,
    session: sessionData?.session ?? null,
    project: sessionData?.project ?? null,
    containers,
    containerUrls,
  };

  useEffect(() => {
    if (sessionError) {
      router.replace("/editor");
    }
  }, [sessionError, router]);

  if (sessionError) {
    return null;
  }

  return (
    <BrowserStreamProvider sessionId={sessionId}>
      <SessionContext.Provider value={contextValue}>
        <div className="grid h-full grid-cols-[2fr_1fr]">
          <div className="min-h-0 min-w-0 border-border border-r">
            {children}
          </div>
          <SessionInfoPanel />
        </div>
      </SessionContext.Provider>
    </BrowserStreamProvider>
  );
}

function SessionInfoPanel() {
  const router = useRouter();
  const { session, project, containers } = useSessionContext();
  const deleteSession = useDeleteSession();

  const handleDelete = () => {
    if (!session) {
      return;
    }
    deleteSession(session, () => router.push("/editor"));
  };

  if (!(session && project)) {
    return null;
  }

  return (
    <div className="z-20 min-w-64 overflow-y-auto bg-bg">
      <SessionInfoView
        containers={containers}
        onDelete={handleDelete}
        project={project}
        session={session}
      />
    </div>
  );
}

import { createContext, useContext } from "react";

interface SessionContextValue {
  sessionId: string;
  session: Session | null;
  project: Project | null;
  containers: SessionContainer[];
  containerUrls: string[];
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionContext must be used within SessionLayout");
  }
  return context;
}

export type { SessionContainer };
