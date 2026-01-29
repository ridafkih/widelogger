import type { ReactNode } from "react";
import { cn } from "@lab/ui/utils/cn";
import { Copy } from "@lab/ui/components/copy";
import { Checkbox } from "@lab/ui/components/checkbox";
import {
  type FileChangeType,
  fileChangeTypeIcons,
  fileChangeTypeColors,
} from "@/lib/file-change";

export type { FileChangeType };

interface FileStatusItemProps {
  children: ReactNode;
}

interface FileStatusItemCheckboxProps {
  checked: boolean;
  onChange: () => void;
}

interface FileStatusItemIconProps {
  changeType: FileChangeType;
}

interface FileStatusItemLabelProps {
  children: ReactNode;
  dismissed?: boolean;
  muted?: boolean;
}

export function FileStatusItem({ children }: FileStatusItemProps) {
  return <div className="flex items-center gap-1.5">{children}</div>;
}

export function FileStatusItemCheckbox({ checked, onChange }: FileStatusItemCheckboxProps) {
  return <Checkbox checked={checked} onChange={onChange} />;
}

export function FileStatusItemIcon({ changeType }: FileStatusItemIconProps) {
  const Icon = fileChangeTypeIcons[changeType];
  return <Icon className={cn("size-3 shrink-0", fileChangeTypeColors[changeType])} />;
}

export function FileStatusItemLabel({ children, dismissed, muted }: FileStatusItemLabelProps) {
  return (
    <Copy
      size="xs"
      className={cn(
        "flex-1 truncate",
        dismissed && "line-through text-muted-foreground",
        muted && "text-muted-foreground",
      )}
    >
      {children}
    </Copy>
  );
}
