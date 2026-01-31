import type { ReactNode } from "react";

type SidebarProps = {
  nav: ReactNode;
  children: ReactNode;
  footer: ReactNode;
};

export function Sidebar({ nav, children, footer }: SidebarProps) {
  return (
    <aside className="flex flex-col h-full w-1/2 border-r border-border bg-bg">
      {nav}
      {children}
      {footer}
    </aside>
  );
}
