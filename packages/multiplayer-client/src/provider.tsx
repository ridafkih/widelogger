import type { Schema } from "@lab/multiplayer-sdk";
import { Provider as JotaiProvider, useSetAtom } from "jotai";
import { createContext, type ReactNode, useEffect, useMemo } from "react";
import { connectionStateAtom } from "./atoms";
import { type ConnectionConfig, ConnectionManager } from "./connection";
import { createHooks } from "./hooks";

export interface MultiplayerContextValue {
  connection: ConnectionManager;
}

export const MultiplayerContext = createContext<MultiplayerContextValue | null>(
  null
);

interface MultiplayerProviderInnerProps {
  connection: ConnectionManager;
  children: ReactNode;
}

function MultiplayerProviderInner({
  connection,
  children,
}: MultiplayerProviderInnerProps) {
  const setConnectionState = useSetAtom(connectionStateAtom);

  useEffect(() => {
    const unsubscribe = connection.onStateChange(setConnectionState);
    connection.connect();

    return () => {
      unsubscribe();
      connection.disconnect();
    };
  }, [connection, setConnectionState]);

  const contextValue = useMemo(() => ({ connection }), [connection]);

  return (
    <MultiplayerContext.Provider value={contextValue}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function createMultiplayerProvider<S extends Schema>(schema: S) {
  const { useMultiplayer } = createHooks(schema);

  interface ProviderProps {
    config: ConnectionConfig;
    children: ReactNode;
  }

  function MultiplayerProvider({ config, children }: ProviderProps) {
    const connection = useMemo(
      () => new ConnectionManager(config),
      [config.url, config]
    );

    return (
      <JotaiProvider>
        <MultiplayerProviderInner connection={connection}>
          {children}
        </MultiplayerProviderInner>
      </JotaiProvider>
    );
  }

  return {
    MultiplayerProvider,
    useMultiplayer,
  };
}
