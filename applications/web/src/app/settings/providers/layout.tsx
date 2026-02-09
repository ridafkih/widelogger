"use client";

import type { ReactNode } from "react";
import { ProvidersList } from "@/components/settings/providers-list";

interface ProvidersLayoutProps {
  children: ReactNode;
}

export default function ProvidersLayout({ children }: ProvidersLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="min-w-60 shrink-0 overflow-y-auto border-border border-r">
        <ProvidersList.View />
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
