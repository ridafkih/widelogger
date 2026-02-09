import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { Copy } from "./copy";
import { Heading } from "./heading";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className
      )}
    >
      {icon && <span className="mb-4 text-muted-foreground">{icon}</span>}
      <Heading as="h3" size="lg">
        {title}
      </Heading>
      {description && (
        <Copy className="mt-1 max-w-sm" muted size="sm">
          {description}
        </Copy>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
