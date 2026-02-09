import type { SessionStatus as BaseSessionStatus } from "@lab/client";
import {
  AlertCircle,
  Check,
  CircleDashed,
  Loader2,
  Trash2,
} from "lucide-react";
import { tv } from "tailwind-variants";

type UnifiedSessionStatus =
  | "starting"
  | "running"
  | "generating"
  | "error"
  | "deleting";
type StatusIconStatus = BaseSessionStatus | UnifiedSessionStatus;

const statusIcon = tv({
  base: "shrink-0",
  variants: {
    status: {
      creating: "animate-spin text-text-muted",
      loading: "animate-spin text-text-muted",
      idle: "text-text-muted",
      complete: "text-accent",
      starting: "animate-spin text-text-muted",
      running: "text-text-muted",
      generating: "animate-spin text-accent",
      error: "text-red-500",
      deleting: "text-text-muted",
    },
  },
});

interface StatusIconProps {
  status: StatusIconStatus;
  size?: number;
}

export function StatusIcon({ status, size = 14 }: StatusIconProps) {
  const className = statusIcon({ status });

  switch (status) {
    case "creating":
    case "loading":
    case "starting":
    case "generating":
      return <Loader2 className={className} size={size} />;
    case "idle":
    case "running":
      return <CircleDashed className={className} size={size} />;
    case "complete":
      return <Check className={className} size={size} />;
    case "error":
      return <AlertCircle className={className} size={size} />;
    case "deleting":
      return <Trash2 className={className} size={size} />;
  }
}
