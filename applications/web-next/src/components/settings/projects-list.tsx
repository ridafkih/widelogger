"use client";

import Link from "next/link";
import { Box, ChevronRight, Plus } from "lucide-react";
import { useProjects } from "@/lib/hooks";

export function ProjectsList() {
  const { data: projects, error, isLoading } = useProjects();

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">Projects</span>
        <Link
          href="/settings/projects/create"
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text"
        >
          <Plus size={12} />
          Create New
        </Link>
      </div>

      {isLoading && <span className="text-xs text-text-muted">Loading...</span>}
      {error && <span className="text-xs text-red-500">Failed to load projects</span>}
      {projects && projects.length === 0 && (
        <span className="text-xs text-text-muted">No projects yet</span>
      )}
      {projects && projects.length > 0 && (
        <div className="flex flex-col gap-px bg-border border border-border">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/settings/projects/${project.id}`}
              className="flex items-center gap-1.5 px-2 py-1.5 bg-bg text-xs text-left hover:bg-bg-hover"
            >
              <Box size={12} className="text-text-muted shrink-0" />
              <span className="text-text truncate">{project.name}</span>
              <ChevronRight size={12} className="text-text-muted ml-auto shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
