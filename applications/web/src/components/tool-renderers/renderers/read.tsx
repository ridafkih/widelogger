"use client";

import {
  ContentCode,
  ContentError,
  getString,
  parseFileOutput,
} from "../shared";
import type { ToolRendererProps } from "../types";

function ReadRenderer({ input, output, error, status }: ToolRendererProps) {
  const filePath = getString(input, "filePath");

  const parsedContent = output ? parseFileOutput(output) : null;

  return (
    <div className="flex flex-col">
      {parsedContent && status === "completed" && (
        <div className="max-h-80 w-0 min-w-full overflow-x-auto overflow-y-auto">
          <ContentCode content={parsedContent} filename={filePath} />
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

export { ReadRenderer };
