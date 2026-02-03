"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { createOpencodeClient, type Event } from "@opencode-ai/sdk/v2/client";

type EventListener = (event: Event) => void;

function getApiUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL must be set");
  return apiUrl;
}

interface OpenCodeSessionContextValue {
  sessionId: string | null;
  subscribe: (listener: EventListener) => () => void;
}

const OpenCodeSessionContext = createContext<OpenCodeSessionContextValue | null>(null);

interface OpenCodeSessionProviderProps {
  sessionId: string | null;
  children: ReactNode;
}

export function OpenCodeSessionProvider({ sessionId, children }: OpenCodeSessionProviderProps) {
  const listenersRef = useRef<Set<EventListener>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!sessionId) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const signal = abortController.signal;

    const client = createOpencodeClient({
      baseUrl: `${getApiUrl()}/opencode`,
      headers: { "X-Lab-Session-Id": sessionId },
    });

    (async () => {
      try {
        console.log("[OpenCodeSession] Starting SSE subscription for session:", sessionId);
        const { stream } = await client.event.subscribe({}, { signal });
        console.log("[OpenCodeSession] SSE subscription established");

        for await (const event of stream) {
          console.log("[OpenCodeSession] Raw event received:", event.type);
          for (const listener of listenersRef.current) {
            listener(event);
          }
        }
        console.log("[OpenCodeSession] SSE stream ended");
      } catch (error) {
        if (!signal.aborted) {
          console.error("[OpenCodeSession] SSE error:", error);
        }
        // Connection closed or aborted - cleanup handles this
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [sessionId]);

  const subscribe = (listener: EventListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  };

  return (
    <OpenCodeSessionContext.Provider value={{ sessionId, subscribe }}>
      {children}
    </OpenCodeSessionContext.Provider>
  );
}

export function useOpenCodeSession() {
  const context = useContext(OpenCodeSessionContext);
  if (!context) {
    throw new Error("useOpenCodeSession must be used within OpenCodeSessionProvider");
  }
  return context;
}

export type { Event };
