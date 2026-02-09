"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tv } from "tailwind-variants";
import { Header } from "./layout-primitives";

const link = tv({
  base: "cursor-pointer text-text-secondary hover:text-text",
  variants: {
    active: {
      true: "text-text",
    },
  },
});

interface NavItem {
  label: string;
  href: string;
  match?: string; // Optional pattern to match against pathname (defaults to href)
}

interface NavProps {
  items: NavItem[];
}

export function Nav({ items }: NavProps) {
  const pathname = usePathname();

  const getIsActive = (item: NavItem) => {
    const pattern = item.match ?? item.href;
    if (pattern === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(pattern);
  };

  return (
    <Header as="nav" className="whitespace-nowrap font-medium" spacing="wide">
      {items.map((item) => (
        <Link
          className={link({ active: getIsActive(item) })}
          draggable={false}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </Header>
  );
}
