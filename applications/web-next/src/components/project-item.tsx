"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, Box, Plus } from "lucide-react";

type ProjectItemProps = {
  name: string;
  sessionCount: number;
  children?: ReactNode;
  onAddSession?: () => void;
};

export function ProjectItem({ name, sessionCount, children, onAddSession }: ProjectItemProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="not-first:border-t last:border-b border-border">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-muted hover:bg-bg-hover cursor-pointer border-b border-border">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <ChevronRight
            size={14}
            className={`text-text-muted shrink-0 ${expanded ? "rotate-90" : ""}`}
          />
          <Box size={14} className="text-text-secondary shrink-0" />
          <span className="truncate">{name}</span>
          <span className="text-text-muted">{sessionCount}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddSession?.();
          }}
          className="text-text-muted hover:text-text shrink-0"
        >
          <Plus size={14} />
        </button>
      </div>
      {expanded && <div className="divide-y divide-border">{children}</div>}
    </div>
  );
}
