import type { ReactNode } from "react";
import { cn } from "../utils/cn";

interface ActionGroupProps {
  children: ReactNode;
  className?: string;
}

export function ActionGroup({ children, className }: ActionGroupProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>{children}</div>
  );
}
