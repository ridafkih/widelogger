import { widelog } from "./logging";
import { registerAdapter, getAllAdapters } from "./platforms";
import { imessageAdapter } from "./platforms/imessage/adapter";
import type { env } from "./env";

type SetupOptions = {
  env: (typeof env)["inferOut"];
};

type SetupFunction = (options: SetupOptions) => unknown;

export const setup = (({ env }) => {
  return widelog.context(() => {
    widelog.set("event_name", "platform_bridge.setup");

    const config = {
      apiUrl: env.API_URL,
      apiWsUrl: env.API_WS_URL,
      imessageEnabled: env.IMESSAGE_ENABLED !== "false",
      imessageWatchedContacts: env.IMESSAGE_WATCHED_CONTACTS?.split(",").filter(Boolean) ?? [],
      imessageContextMessages: parseInt(env.IMESSAGE_CONTEXT_MESSAGES ?? "20", 10),
      staleSessionThresholdMs: parseInt(env.STALE_SESSION_THRESHOLD_MS ?? "86400000", 10),
    };

    if (config.imessageEnabled) {
      registerAdapter(imessageAdapter);
    }

    const adapters = getAllAdapters();
    widelog.set("adapters_registered", adapters.length);
    widelog.flush();

    return { config, adapters };
  });
}) satisfies SetupFunction;
