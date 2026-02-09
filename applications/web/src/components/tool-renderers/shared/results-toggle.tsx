"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface ResultsToggleProps {
  expanded: boolean;
  onToggle: () => void;
  label: string;
  count?: number;
}

function ResultsToggle({
  expanded,
  onToggle,
  label,
  count,
}: ResultsToggleProps) {
  return (
    <button
      className="flex items-center gap-1 text-text-muted text-xs hover:text-text-secondary"
      onClick={onToggle}
      type="button"
    >
      <ChevronRight className={cn(expanded && "rotate-90")} size={12} />
      <span>{label}</span>
      {count !== undefined && <span>({count})</span>}
    </button>
  );
}

export { ResultsToggle };
