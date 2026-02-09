"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, use, useEffect, useMemo } from "react";
import { SWRConfig } from "swr";
import { useSession } from "@/lib/auth-client";
import { MultiplayerProvider } from "@/lib/multiplayer";

interface ProvidersProps {
  children: ReactNode;
  fallback?: Record<string, unknown>;
}

const SWR_CONFIG = {
  dedupingInterval: 2000,
  revalidateOnFocus: false,
  shouldRetryOnError: true,
  errorRetryCount: 3,
} as const;

const MultiplayerEnabledContext = createContext(false);

export function useMultiplayerEnabled() {
  return use(MultiplayerEnabledContext);
}

function AuthGate({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!(isPending || session) && pathname !== "/login") {
      router.replace("/login");
    }
  }, [isPending, session, pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (isPending) {
    return null;
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}

export function Providers({ children, fallback = {} }: ProvidersProps) {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

  const swrValue = useMemo(() => ({ ...SWR_CONFIG, fallback }), [fallback]);

  const swrContent = (
    <SWRConfig value={swrValue}>
      <AuthGate>{children}</AuthGate>
    </SWRConfig>
  );

  if (!wsUrl) {
    return (
      <MultiplayerEnabledContext value={false}>
        {swrContent}
      </MultiplayerEnabledContext>
    );
  }

  return (
    <MultiplayerEnabledContext value={true}>
      <MultiplayerProvider config={{ url: wsUrl }}>
        {swrContent}
      </MultiplayerProvider>
    </MultiplayerEnabledContext>
  );
}
