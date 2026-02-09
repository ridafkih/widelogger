import type { ReactNode } from "react";
import { tv } from "tailwind-variants";

const breadcrumbItem = tv({
  base: "overflow-x-hidden truncate text-nowrap",
  variants: {
    muted: {
      true: "text-text-muted italic",
      false: "font-medium text-text",
    },
  },
  defaultVariants: {
    muted: false,
  },
});

function BreadcrumbRoot({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1 overflow-x-hidden">{children}</div>
  );
}

function BreadcrumbItem({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return <span className={breadcrumbItem({ muted })}>{children}</span>;
}

function BreadcrumbMutedItem({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 overflow-x-hidden truncate text-nowrap text-text-muted">
      {children}
    </span>
  );
}

function BreadcrumbSeparator() {
  return <span className="text-text-muted">/</span>;
}

const Breadcrumb = {
  Root: BreadcrumbRoot,
  Item: BreadcrumbItem,
  MutedItem: BreadcrumbMutedItem,
  Separator: BreadcrumbSeparator,
};

export { Breadcrumb };
