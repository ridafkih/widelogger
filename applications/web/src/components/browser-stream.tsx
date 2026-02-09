"use client";

import type { ReactNode } from "react";
import { BrowserCanvas } from "./browser-canvas";

interface BrowserStreamProviderProps {
  sessionId: string;
  children: ReactNode;
}

export function BrowserStreamProvider({
  sessionId,
  children,
}: BrowserStreamProviderProps) {
  return (
    <BrowserCanvas.Root sessionId={sessionId}>{children}</BrowserCanvas.Root>
  );
}

export function BrowserStreamView({ className }: { className?: string }) {
  return (
    <>
      <BrowserCanvas.Placeholder />
      <BrowserCanvas.View className={className} />
    </>
  );
}
