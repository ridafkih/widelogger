"use client";

import { BrowserCanvas, useBrowserStream } from "./browser-canvas";
import type { ReactNode } from "react";

type BrowserStreamProviderProps = {
  sessionId: string;
  children: ReactNode;
};

export function BrowserStreamProvider({ sessionId, children }: BrowserStreamProviderProps) {
  return <BrowserCanvas.Root sessionId={sessionId}>{children}</BrowserCanvas.Root>;
}

export function BrowserStreamView({ className }: { className?: string }) {
  return (
    <>
      <BrowserCanvas.Placeholder />
      <BrowserCanvas.View className={className} />
    </>
  );
}

export { useBrowserStream };
