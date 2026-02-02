"use client";

import { File, FilePlus, FileX, FileEdit } from "lucide-react";
import { tv } from "tailwind-variants";

type ChangeType = "modified" | "created" | "deleted" | "read";

const iconVariants = tv({
  base: "size-3 shrink-0",
  variants: {
    changeType: {
      modified: "text-yellow-500",
      created: "text-green-500",
      deleted: "text-red-500",
      read: "text-text-muted",
    },
  },
});

const icons = {
  modified: FileEdit,
  created: FilePlus,
  deleted: FileX,
  read: File,
};

type FilePathProps = {
  path: string;
  workingDirectory?: string;
  changeType?: ChangeType;
};

function FilePath({ path, workingDirectory, changeType = "read" }: FilePathProps) {
  const relativePath =
    workingDirectory && path.startsWith(workingDirectory)
      ? path.slice(workingDirectory.length).replace(/^\//, "")
      : path;

  const Icon = icons[changeType];

  return (
    <span className="inline-flex items-center gap-1.5 min-w-0 overflow-hidden w-full">
      <Icon className={iconVariants({ changeType })} />
      <span className="text-xs truncate">{relativePath}</span>
    </span>
  );
}

export { FilePath, type FilePathProps, type ChangeType };
