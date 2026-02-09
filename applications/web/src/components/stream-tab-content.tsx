"use client";

import { BrowserStreamView } from "@/components/browser-stream";

export function StreamTabContent() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center bg-bg-muted p-4">
        <div className="w-full max-w-4xl">
          <BrowserStreamView />
        </div>
      </div>
    </div>
  );
}
