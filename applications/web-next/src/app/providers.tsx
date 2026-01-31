"use client";

import { createContext, use, type ReactNode } from "react";
import { MultiplayerProvider } from "@/lib/multiplayer";

interface ProvidersProps {
  children: ReactNode;
}

export const MultiplayerEnabledContext = createContext(false);

export function useMultiplayerEnabled() {
  return use(MultiplayerEnabledContext);
}

export function Providers({ children }: ProvidersProps) {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

  if (!wsUrl) {
    return <MultiplayerEnabledContext value={false}>{children}</MultiplayerEnabledContext>;
  }

  return (
    <MultiplayerEnabledContext value={true}>
      <MultiplayerProvider config={{ url: wsUrl }}>{children}</MultiplayerProvider>
    </MultiplayerEnabledContext>
  );
}
