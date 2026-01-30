"use client";

import { useEffect, useState } from "react";
import { Copy } from "@lab/ui/components/copy";
import { cn } from "@lab/ui/utils/cn";
import { Loader2, AlertCircle } from "lucide-react";
import { useMultiplayer } from "@/lib/multiplayer/client";

type BrowserStreamState = {
  desiredState: "running" | "stopped";
  currentState: "pending" | "starting" | "running" | "stopping" | "stopped" | "error";
  streamPort?: number;
  errorMessage?: string;
};

type BrowserStreamProps = {
  sessionId: string;
  className?: string;
  browserStreamState?: BrowserStreamState;
};

const defaultBrowserStreamState: BrowserStreamState = {
  desiredState: "stopped",
  currentState: "stopped",
};

export function BrowserStream({
  sessionId,
  className,
  browserStreamState = defaultBrowserStreamState,
}: BrowserStreamProps) {
  const [frame, setFrame] = useState<string | null>(null);
  const { useChannel, useChannelEvent } = useMultiplayer();

  const snapshot = useChannel("sessionBrowserFrames", { uuid: sessionId });
  const { currentState, errorMessage } = browserStreamState;

  useEffect(() => {
    if (!snapshot.lastFrame) return;
    setFrame(`data:image/jpeg;base64,${snapshot.lastFrame}`);
  }, [snapshot.lastFrame]);

  useChannelEvent(
    "sessionBrowserFrames",
    (event: { type: "frame"; data: string; timestamp: number }) =>
      setFrame(`data:image/jpeg;base64,${event.data}`),
    { uuid: sessionId },
  );

  if (currentState === "stopped") {
    return (
      <div className={cn("aspect-video bg-muted flex items-center justify-center", className)}>
        <Copy size="xs" muted>
          Browser stopped
        </Copy>
      </div>
    );
  }

  if (currentState === "pending" || currentState === "starting") {
    return (
      <div
        className={cn(
          "aspect-video bg-muted flex flex-col items-center justify-center gap-2",
          className,
        )}
      >
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <Copy size="xs" muted>
          {currentState === "pending" ? "Preparing browser..." : "Starting browser..."}
        </Copy>
      </div>
    );
  }

  if (currentState === "stopping") {
    return (
      <div
        className={cn(
          "aspect-video bg-muted flex flex-col items-center justify-center gap-2",
          className,
        )}
      >
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <Copy size="xs" muted>
          Stopping browser...
        </Copy>
      </div>
    );
  }

  if (currentState === "error") {
    return (
      <div
        className={cn(
          "aspect-video bg-muted flex flex-col items-center justify-center gap-2",
          className,
        )}
      >
        <AlertCircle className="size-5 text-destructive" />
        <Copy size="xs" muted>
          {errorMessage ?? "Browser error"}
        </Copy>
      </div>
    );
  }

  if (!frame) {
    return (
      <div className={cn("aspect-video bg-muted flex items-center justify-center", className)}>
        <Copy size="xs" muted>
          Waiting for frames...
        </Copy>
      </div>
    );
  }

  return (
    <div className={cn("aspect-video bg-muted", className)}>
      <img src={frame} alt="Browser viewport" className="w-full h-full object-contain" />
    </div>
  );
}
