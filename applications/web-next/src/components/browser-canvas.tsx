"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  createContext,
  use,
  type RefObject,
  type ReactNode,
} from "react";
import { useMultiplayer } from "@/lib/multiplayer";
import { useMultiplayerEnabled } from "@/app/providers";
import { cn } from "@/lib/cn";

function useCanvasStream(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const [hasFrame, setHasFrame] = useState(false);
  const hasFrameRef = useRef(false);

  const drawFrame = useCallback(
    (base64: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      fetch(`data:image/jpeg;base64,${base64}`)
        .then((res) => res.blob())
        .then((blob) => createImageBitmap(blob))
        .then((bitmap) => {
          if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
          }
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          if (!hasFrameRef.current) {
            hasFrameRef.current = true;
            setHasFrame(true);
          }
        })
        .catch((error) => {
          console.error("Failed to draw frame:", error);
        });
    },
    [canvasRef],
  );

  return { hasFrame, drawFrame };
}

type BrowserCurrentState = "pending" | "stopped" | "starting" | "running" | "stopping" | "error";

interface BrowserCanvasState {
  hasFrame: boolean;
  currentState: BrowserCurrentState;
  errorMessage?: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

const BrowserCanvasContext = createContext<BrowserCanvasState | null>(null);

function useBrowserCanvas() {
  const context = use(BrowserCanvasContext);
  if (!context) {
    throw new Error("useBrowserCanvas must be used within BrowserCanvas.Root");
  }
  return context;
}

interface RootProps {
  sessionId: string;
  children: ReactNode;
}

function BrowserCanvasRoot({ sessionId, children }: RootProps) {
  const isEnabled = useMultiplayerEnabled();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { hasFrame, drawFrame } = useCanvasStream(canvasRef);
  const { useChannel, useChannelEvent } = useMultiplayer();

  // Subscribe to browser state - this triggers the browser to start
  const browserState = useChannel("sessionBrowserState", { uuid: sessionId });
  const frameSnapshot = useChannel("sessionBrowserFrames", { uuid: sessionId });

  useEffect(() => {
    if (isEnabled && frameSnapshot.lastFrame) {
      drawFrame(frameSnapshot.lastFrame);
    }
  }, [isEnabled, frameSnapshot.lastFrame, drawFrame]);

  const handleFrameEvent = useCallback(
    (event: { type: "frame"; data: string; timestamp: number }) => {
      drawFrame(event.data);
    },
    [drawFrame],
  );

  useChannelEvent("sessionBrowserFrames", handleFrameEvent, { uuid: sessionId });

  return (
    <BrowserCanvasContext
      value={{
        hasFrame: isEnabled && hasFrame,
        currentState: browserState.currentState,
        errorMessage: browserState.errorMessage ?? undefined,
        canvasRef,
      }}
    >
      {children}
    </BrowserCanvasContext>
  );
}

function BrowserCanvasPlaceholder({ children }: { children?: ReactNode }) {
  const { hasFrame } = useBrowserCanvas();

  if (hasFrame) return null;

  if (children) return children;

  return (
    <div
      className="aspect-video flex items-center justify-center"
      style={{
        background:
          "repeating-linear-gradient(-45deg, var(--color-bg-muted), var(--color-bg-muted) 4px, var(--color-bg) 4px, var(--color-bg) 8px)",
      }}
    >
      <div className="size-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function BrowserCanvasView({ className }: { className?: string }) {
  const { hasFrame, canvasRef } = useBrowserCanvas();

  return (
    <div
      className={cn("relative overflow-hidden", className ?? "aspect-video bg-black")}
      style={{ display: hasFrame ? undefined : "none" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain" />
    </div>
  );
}

export const BrowserCanvas = {
  Root: BrowserCanvasRoot,
  Placeholder: BrowserCanvasPlaceholder,
  View: BrowserCanvasView,
};
