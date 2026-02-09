"use client";

import { useState } from "react";
import { ContentError, ContentText, getString, ResultsToggle } from "../shared";
import type { ToolRendererProps } from "../types";

function GlobRenderer({ input, output, error, status }: ToolRendererProps) {
  const [expanded, setExpanded] = useState(false);

  const pattern = getString(input, "pattern");
  const path = getString(input, "path");

  const fileCount = output
    ? output.split("\n").filter((line) => line.trim()).length
    : 0;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-1 bg-bg-muted px-4 py-2">
        {pattern && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Pattern:</span>
            <code className="font-mono">{pattern}</code>
          </div>
        )}
        {path && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">in:</span>
            <span>{path}</span>
          </div>
        )}
      </div>
      {output && status === "completed" && (
        <div className="bg-bg-muted px-4 py-2">
          <ResultsToggle
            count={fileCount}
            expanded={expanded}
            label="Files"
            onToggle={() => setExpanded(!expanded)}
          />
          {expanded && (
            <div className="mt-2">
              <ContentText maxLines={20}>{output}</ContentText>
            </div>
          )}
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

export { GlobRenderer };
