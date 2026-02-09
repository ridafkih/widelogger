"use client";

import type { Project, Session } from "@lab/client";
import { Box, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { tv } from "tailwind-variants";
import { useCreateSession, useProjects, useSessions } from "@/lib/hooks";
import { useSessionsSync } from "@/lib/use-sessions-sync";
import { IconButton } from "./icon-button";
import { SessionItem } from "./session-item";

const row = tv({
  base: "flex items-center gap-2 py-2",
  variants: {
    type: {
      project: "cursor-default text-text-secondary",
      session: "cursor-pointer hover:brightness-75",
    },
  },
});

function SessionListRoot({ children }: { children: ReactNode }) {
  return <div className="flex flex-col">{children}</div>;
}

function SessionListProject({
  project,
  children,
}: {
  project: Project;
  children?: ReactNode;
}) {
  const router = useRouter();
  const { data: sessions } = useSessions(project.id);
  const createSession = useCreateSession();

  const sessionCount = sessions?.length ?? 0;

  const handleAddSession = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const session = await createSession(project.id);
    if (session) {
      router.push(`/editor/${session.id}/chat`);
    }
  };

  return (
    <div>
      <div className={row({ type: "project" })}>
        <Box className="shrink-0" size={14} />
        <span className="text-nowrap font-medium">{project.name}</span>
        <span className="text-text-muted text-xs">{sessionCount}</span>
        <IconButton
          className="ml-auto opacity-0 group-hover:opacity-100"
          onClick={handleAddSession}
        >
          <Plus size={14} />
        </IconButton>
      </div>
      {children}
    </div>
  );
}

function SessionListItem({ session }: { session: Session }) {
  return (
    <SessionItem.Provider session={session}>
      <SessionItem.Link className={row({ type: "session" })}>
        <div className="flex max-w-1/2 items-center gap-2">
          <div className="flex shrink-0 items-center gap-2">
            <SessionItem.Status />
            <SessionItem.Hash />
          </div>
          <SessionItem.Title />
        </div>
        <div className="flex grow justify-end overflow-hidden">
          <SessionItem.LastMessage />
        </div>
      </SessionItem.Link>
    </SessionItem.Provider>
  );
}

function SessionListEmpty() {
  return (
    <div className="py-4 text-center text-sm text-text-muted">
      No projects yet
    </div>
  );
}

function SessionListLoading() {
  return (
    <div className="py-2">
      <div className="flex items-center gap-2 py-2 text-text-muted">
        <div className="h-3.5 w-3.5 animate-pulse rounded-full bg-bg-hover" />
        <div className="h-3 w-24 animate-pulse rounded bg-bg-hover" />
      </div>
    </div>
  );
}

function SessionListView() {
  const { data: projects, isLoading } = useProjects();

  useSessionsSync();

  if (isLoading) {
    return <SessionListLoading />;
  }

  if (!projects || projects.length === 0) {
    return <SessionListEmpty />;
  }

  return (
    <SessionListRoot>
      {projects.map((project) => (
        <SessionListProject key={project.id} project={project}>
          <SessionListSessions projectId={project.id} />
        </SessionListProject>
      ))}
    </SessionListRoot>
  );
}

function SessionListSessions({ projectId }: { projectId: string }) {
  const { data: sessions } = useSessions(projectId);

  if (!sessions || sessions.length === 0) {
    return null;
  }

  return (
    <>
      {sessions.map((session) => (
        <SessionListItem key={session.id} session={session} />
      ))}
    </>
  );
}

export const SessionList = {
  Root: SessionListRoot,
  Project: SessionListProject,
  Item: SessionListItem,
  Sessions: SessionListSessions,
  Empty: SessionListEmpty,
  Loading: SessionListLoading,
  View: SessionListView,
};
