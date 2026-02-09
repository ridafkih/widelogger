"use client";

import { Bot } from "lucide-react";
import { ContentError, ContentText, getString } from "../shared";
import type { ToolRendererProps } from "../types";

function TaskRenderer({ input, output, error, status }: ToolRendererProps) {
  const description = getString(input, "description");
  const prompt = getString(input, "prompt");
  const subagentType = getString(input, "subagent_type");

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 bg-bg-muted px-4 py-2">
        <Bot className="shrink-0 text-text-muted" size={12} />
        <span className="text-xs">{description ?? "Task"}</span>
        {subagentType && (
          <span className="text-text-muted text-xs">({subagentType})</span>
        )}
      </div>
      {prompt && (
        <div className="bg-bg-muted px-4 py-2">
          <p className="line-clamp-3 border-border border-l-2 pl-2 text-text-muted text-xs">
            {prompt}
          </p>
        </div>
      )}
      {output && status === "completed" && (
        <div className="w-0 min-w-full bg-bg-muted px-4 py-2">
          <ContentText maxLines={15}>{output}</ContentText>
        </div>
      )}
      {error && (
        <div className="w-0 min-w-full bg-bg-muted px-4 py-2">
          <ContentError>{error}</ContentError>
        </div>
      )}
    </div>
  );
}

export { TaskRenderer };
