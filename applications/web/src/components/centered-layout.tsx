"use client";

import type { ReactNode } from "react";

function CenteredLayoutRoot({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto pb-12">
      <div className="flex min-h-full flex-col items-center px-4">
        <div className="flex w-full max-w-2xl flex-col">{children}</div>
      </div>
    </div>
  );
}

function CenteredLayoutHero({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[50vh] items-end pb-4">{children}</div>;
}

function CenteredLayoutContent({ children }: { children: ReactNode }) {
  return <div className="pb-8">{children}</div>;
}

export const CenteredLayout = {
  Root: CenteredLayoutRoot,
  Hero: CenteredLayoutHero,
  Content: CenteredLayoutContent,
};
