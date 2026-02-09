"use client";

import type { Project } from "@lab/client";
import { Box, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, type ReactNode, use } from "react";
import { tv } from "tailwind-variants";
import { cn } from "@/lib/cn";
import { useProjects } from "@/lib/hooks";

interface ProjectsListContextValue {
  state: {
    projects: Project[];
    isLoading: boolean;
    error: Error | null;
  };
  actions: {
    refetch: () => void;
  };
}

const ProjectsListContext = createContext<ProjectsListContextValue | null>(
  null
);

function useProjectsList() {
  const context = use(ProjectsListContext);
  if (!context) {
    throw new Error(
      "ProjectsList components must be used within ProjectsList.Provider"
    );
  }
  return context;
}

function ProjectsListProvider({ children }: { children: ReactNode }) {
  const { data, error, isLoading, mutate } = useProjects();

  const sortedProjects = [...(data ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const contextValue: ProjectsListContextValue = {
    state: {
      projects: sortedProjects,
      isLoading,
      error: error ?? null,
    },
    actions: {
      refetch: mutate,
    },
  };

  return (
    <ProjectsListContext value={contextValue}>{children}</ProjectsListContext>
  );
}

function ProjectsListRoot({ children }: { children: ReactNode }) {
  return <div className="flex flex-col">{children}</div>;
}

function ProjectsListHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5">
      <span className="text-text-secondary text-xs">{children}</span>
      <Link
        className="flex items-center gap-1 text-text-muted text-xs hover:text-text"
        href="/settings/projects/create"
      >
        <Plus size={10} />
      </Link>
    </div>
  );
}

function ProjectsListLoading() {
  const { state } = useProjectsList();
  if (!state.isLoading) {
    return null;
  }
  return (
    <span className="px-2 py-1.5 text-text-muted text-xs">Loading...</span>
  );
}

function ProjectsListError() {
  const { state } = useProjectsList();
  if (!state.error) {
    return null;
  }
  return (
    <span className="px-2 py-1.5 text-red-500 text-xs">Failed to load</span>
  );
}

function ProjectsListEmpty() {
  const { state } = useProjectsList();
  if (state.isLoading || state.error || state.projects.length > 0) {
    return null;
  }
  return (
    <span className="px-2 py-1.5 text-text-muted text-xs">No projects yet</span>
  );
}

const itemStyles = tv({
  base: "flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-bg-hover",
  variants: {
    active: {
      true: "bg-bg-muted",
      false: "",
    },
  },
});

function ProjectsListItem({ project }: { project: Project }) {
  const pathname = usePathname();
  const href = `/settings/projects/${project.id}`;
  const isActive = pathname === href;

  const containerCount = project.containers?.length ?? 0;

  return (
    <Link className={itemStyles({ active: isActive })} href={href}>
      <Box className="shrink-0 text-text-muted" size={12} />
      <span className="truncate text-text">{project.name}</span>
      {containerCount > 0 && (
        <span className={cn("ml-auto shrink-0 text-text-muted")}>
          {containerCount}
        </span>
      )}
    </Link>
  );
}

function ProjectsListItems() {
  const { state } = useProjectsList();
  if (state.isLoading || state.error || state.projects.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {state.projects.map((project) => (
        <ProjectsListItem key={project.id} project={project} />
      ))}
    </div>
  );
}

function ProjectsListView() {
  return (
    <ProjectsListProvider>
      <ProjectsListRoot>
        <ProjectsListHeader>Projects</ProjectsListHeader>
        <ProjectsListLoading />
        <ProjectsListError />
        <ProjectsListEmpty />
        <ProjectsListItems />
      </ProjectsListRoot>
    </ProjectsListProvider>
  );
}

const ProjectsList = {
  Provider: ProjectsListProvider,
  Root: ProjectsListRoot,
  Header: ProjectsListHeader,
  Loading: ProjectsListLoading,
  Error: ProjectsListError,
  Empty: ProjectsListEmpty,
  Item: ProjectsListItem,
  Items: ProjectsListItems,
  View: ProjectsListView,
};

export { ProjectsList };
