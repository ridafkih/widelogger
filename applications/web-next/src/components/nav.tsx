"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tv } from "tailwind-variants";
import { Header } from "./layout-primitives";

const link = tv({
  base: "text-text-secondary hover:text-text cursor-pointer",
  variants: {
    active: {
      true: "text-text",
    },
  },
});

type NavItem = {
  label: string;
  href: string;
};

type NavProps = {
  items: NavItem[];
};

export function Nav({ items }: NavProps) {
  const pathname = usePathname();

  const getIsActive = (item: NavItem) => {
    if (item.href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(item.href);
  };

  return (
    <Header as="nav" spacing="wide" className="whitespace-nowrap font-medium">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={link({ active: getIsActive(item) })}>
          {item.label}
        </Link>
      ))}
    </Header>
  );
}

export type { NavItem };
