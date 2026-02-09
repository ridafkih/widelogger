"use client";

import { ContentError } from "../shared";
import type { ToolRendererProps } from "../types";

function flattenInput(input: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === "string" && value.length > 100) {
      parts.push(`${key}: "${value.slice(0, 100)}..."`);
    } else if (typeof value === "object") {
      parts.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      parts.push(`${key}: ${value}`);
    }
  }
  return parts.join(", ");
}

function FallbackRenderer({ input, output, error, status }: ToolRendererProps) {
  return (
    <div className="flex flex-col">
      {input && Object.keys(input).length > 0 && (
        <pre className="wrap-break-word w-0 min-w-full whitespace-pre-wrap bg-bg-muted px-4 py-2 font-mono text-xs">
          {flattenInput(input)}
        </pre>
      )}
      {output && status === "completed" && (
        <pre className="wrap-break-word max-h-40 w-0 min-w-full overflow-y-auto whitespace-pre-wrap bg-bg-muted px-4 py-2 font-mono text-xs">
          {output}
        </pre>
      )}
      {error && (
        <div className="w-0 min-w-full bg-bg-muted px-4 py-2">
          <ContentError>{error}</ContentError>
        </div>
      )}
    </div>
  );
}

export { FallbackRenderer };
