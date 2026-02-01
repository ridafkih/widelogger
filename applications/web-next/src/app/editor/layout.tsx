"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { Nav } from "@/components/nav";
import { ProjectNavigatorView } from "@/components/project-navigator-view";
import { OpenCodeSessionProvider } from "@/lib/opencode-session";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Editor", href: "/editor" },
  { label: "Settings", href: "/settings" },
];

function Sidebar({ selectedSessionId }: { selectedSessionId: string | null }) {
  return (
    <aside className="relative flex flex-col h-full w-1/2 max-w-lg border-r border-border bg-bg">
      <ProjectNavigatorView selectedSessionId={selectedSessionId} />
    </aside>
  );
}

export default function EditorLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : null;

  return (
    <OpenCodeSessionProvider sessionId={sessionId}>
      <div className="flex flex-col h-screen">
        <Nav items={navItems} />
        <div className="flex flex-1 min-h-0">
          <Sidebar selectedSessionId={sessionId} />
          <main className="flex-1 bg-bg">{children}</main>
        </div>
      </div>
    </OpenCodeSessionProvider>
  );
}
