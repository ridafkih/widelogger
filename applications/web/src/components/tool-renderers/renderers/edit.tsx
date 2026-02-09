"use client";

import { ContentDiff, ContentError, getString } from "../shared";
import type { ToolRendererProps } from "../types";

function EditRenderer({ input, error }: ToolRendererProps) {
  const filePath = getString(input, "filePath");
  const oldString = getString(input, "oldString") ?? "";
  const newString = getString(input, "newString") ?? "";

  return (
    <div className="flex flex-col">
      {(oldString || newString) && (
        <div className="max-h-80 w-0 min-w-full overflow-x-auto overflow-y-auto">
          <ContentDiff
            filename={filePath ?? "file"}
            newContent={newString}
            oldContent={oldString}
          />
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

export { EditRenderer };
