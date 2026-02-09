"use client";

import { ContentCode, ContentError, getString } from "../shared";
import type { ToolRendererProps } from "../types";

function WriteRenderer({ input, error }: ToolRendererProps) {
  const filePath = getString(input, "filePath");
  const content = getString(input, "content");

  return (
    <div className="flex flex-col">
      {content && (
        <div className="max-h-80 w-0 min-w-full overflow-x-auto overflow-y-auto">
          <ContentCode content={content} filename={filePath} />
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

export { WriteRenderer };
