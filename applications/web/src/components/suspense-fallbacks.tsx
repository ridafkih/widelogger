"use client";

import { Loader2 } from "lucide-react";
import { ProjectNavigator } from "./project-navigator-list";

export function ProjectsLoadingFallback() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-px bg-border pb-px">
        <ProjectNavigator.HeaderSkeleton />
      </div>
    </div>
  );
}

export function ChatLoadingFallback() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="flex items-center gap-2 text-text-muted">
        <Loader2 className="animate-spin" size={14} />
        <span className="text-xs">Loading conversation...</span>
      </div>
    </div>
  );
}
