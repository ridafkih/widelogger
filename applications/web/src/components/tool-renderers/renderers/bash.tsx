"use client";

import { ContentCode, ContentError, getString } from "../shared";
import type { ToolRendererProps } from "../types";

function BashRenderer({ input, output, error, status }: ToolRendererProps) {
  const command = getString(input, "command");
  const description = getString(input, "description");

  return (
    <div className="flex flex-col">
      {description && (
        <div className="px-4 py-2 text-text-muted text-xs">{description}</div>
      )}
      {command && (
        <div className="w-0 min-w-full bg-bg-muted">
          <ContentCode content={`$ ${command}`} language="bash" />
        </div>
      )}
      {output && status === "completed" && (
        <div className="max-h-60 w-0 min-w-full overflow-y-auto">
          <ContentCode content={output} language="bash" />
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

export { BashRenderer };
