"use client";

import { AlertCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Attachment } from "@/lib/use-attachments";

interface ListProps {
  children: React.ReactNode;
}

function AttachmentPreviewList({ children }: ListProps) {
  return (
    <div className="scrollbar-thin scrollbar-thumb-border flex gap-2 overflow-x-auto px-3 py-2">
      {children}
    </div>
  );
}

interface ItemProps {
  attachment: Attachment;
  onRemove: (id: string) => void;
}

function AttachmentPreviewItem({ attachment, onRemove }: ItemProps) {
  const isLoading = attachment.status === "loading";
  const isError = attachment.status === "error";

  return (
    <div
      className={cn(
        "group relative h-16 w-16 shrink-0 overflow-hidden border border-border bg-bg-muted",
        isError && "border-red-500/50"
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-muted">
          <Loader2 className="animate-spin text-text-muted" size={16} />
        </div>
      )}

      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-muted p-1">
          <AlertCircle className="mb-0.5 text-red-500" size={14} />
          <span className="w-full truncate text-center text-[10px] text-red-500">
            Error
          </span>
        </div>
      )}

      {!(isLoading || isError) && attachment.preview && (
        <img
          alt={attachment.file.name}
          className="h-full w-full object-cover"
          src={attachment.preview}
        />
      )}

      <button
        className="absolute top-0.5 right-0.5 cursor-pointer bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => onRemove(attachment.id)}
        title="Remove attachment"
        type="button"
      >
        <X size={12} />
      </button>

      <div className="absolute right-0 bottom-0 left-0 bg-black/60 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="block truncate text-[10px] text-white">
          {attachment.file.name}
        </span>
      </div>
    </div>
  );
}

export const AttachmentPreview = {
  List: AttachmentPreviewList,
  Item: AttachmentPreviewItem,
};
