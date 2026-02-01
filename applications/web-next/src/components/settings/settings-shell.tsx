"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { tv } from "tailwind-variants";
import { IconButton } from "@/components/icon-button";
import { PageFrame, Header } from "@/components/layout-primitives";

const tab = tv({
  base: "px-3 py-1 text-xs border-b-2 -mb-px",
  variants: {
    active: {
      true: "border-text text-text",
      false: "border-transparent text-text-muted hover:text-text",
    },
  },
});

type SettingsTab = {
  label: string;
  href: string;
};

const tabs: SettingsTab[] = [
  { label: "GitHub", href: "/settings/github" },
  { label: "Providers", href: "/settings/providers" },
  { label: "Projects", href: "/settings/projects" },
];

function SettingsHeader() {
  return (
    <Header>
      <Link className="flex items-center" href="/editor">
        <IconButton>
          <ArrowLeft size={14} />
        </IconButton>
      </Link>
      <span className="text-text font-medium">Settings</span>
    </Header>
  );
}

function SettingsTabs() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/settings/projects") {
      return pathname.startsWith("/settings/projects");
    }
    return pathname === href;
  };

  return (
    <div className="flex border-b border-border">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={tab({ active: isActive(t.href) })}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

type SettingsShellProps = {
  children: ReactNode;
};

export function SettingsShell({ children }: SettingsShellProps) {
  return (
    <PageFrame overflow="hidden">
      <SettingsHeader />
      <SettingsTabs />
      {children}
    </PageFrame>
  );
}
