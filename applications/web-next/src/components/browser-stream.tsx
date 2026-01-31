"use client";

import { BrowserCanvas } from "./browser-canvas";

type BrowserStreamProps = {
  sessionId: string;
};

export function BrowserStream({ sessionId }: BrowserStreamProps) {
  return (
    <BrowserCanvas.Root sessionId={sessionId}>
      <BrowserCanvas.Placeholder />
      <BrowserCanvas.View />
    </BrowserCanvas.Root>
  );
}
