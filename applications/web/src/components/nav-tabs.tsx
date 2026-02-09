"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { tv } from "tailwind-variants";

const tabStyles = tv({
  base: "-mb-px border-b-2 px-3 py-1 text-xs",
  variants: {
    active: {
      true: "border-text text-text",
      false: "border-transparent text-text-muted hover:text-text",
    },
  },
});

interface TabItem {
  label: string;
  href: string;
  match?: string;
}

function NavTabsList({ children }: { children: ReactNode }) {
  return <div className="flex border-border border-b">{children}</div>;
}

function NavTabsTab({
  href,
  match,
  children,
}: {
  href: string;
  match?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = match ? pathname.startsWith(match) : pathname === href;

  return (
    <Link
      className={tabStyles({ active: isActive })}
      draggable={false}
      href={href}
    >
      {children}
    </Link>
  );
}

function NavTabsFromItems({ items }: { items: TabItem[] }) {
  return (
    <NavTabsList>
      {items.map(({ href, label, match }) => (
        <NavTabsTab href={href} key={href} match={match}>
          {label}
        </NavTabsTab>
      ))}
    </NavTabsList>
  );
}

const NavTabs = {
  List: NavTabsList,
  Tab: NavTabsTab,
  FromItems: NavTabsFromItems,
};

export { NavTabs };
export type { TabItem };
