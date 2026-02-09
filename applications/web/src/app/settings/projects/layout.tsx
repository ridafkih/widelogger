"use client";

import type { ReactNode } from "react";
import { ProjectsList } from "@/components/settings/projects-list";

interface ProjectsLayoutProps {
  children: ReactNode;
}

export default function ProjectsLayout({ children }: ProjectsLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="min-w-60 shrink-0 overflow-y-auto border-border border-r">
        <ProjectsList.View />
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
