"use client";

import { Globe } from "lucide-react";
import { ContentError, ContentText, getString } from "../shared";
import type { ToolRendererProps } from "../types";

function WebFetchRenderer({ input, output, error, status }: ToolRendererProps) {
  const url = getString(input, "url");
  const prompt = getString(input, "prompt");

  return (
    <div className="flex flex-col">
      {url && (
        <div className="flex items-center gap-1.5 bg-bg-muted px-4 py-2">
          <Globe className="shrink-0 text-text-muted" size={12} />
          <span className="truncate text-xs">{url}</span>
        </div>
      )}
      {prompt && (
        <div className="bg-bg-muted px-4 py-2 text-text-muted text-xs">
          &quot;{prompt}&quot;
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

export { WebFetchRenderer };
