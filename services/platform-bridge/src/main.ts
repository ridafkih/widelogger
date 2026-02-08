import { widelog } from "./logging";
import { messageRouter } from "./bridge/message-router";
import { responseSubscriber } from "./bridge/response-subscriber";
import { sessionTracker } from "./bridge/session-tracker";
import { multiplayerClient } from "./clients/multiplayer";
import { getAllAdapters } from "./platforms";
import type { setup } from "./setup";
import type { env } from "./env";

type MainOptions = {
  env: (typeof env)["inferOut"];
  extras: ReturnType<typeof setup>;
};

type MainFunction = (options: MainOptions) => unknown;

export const main = (async ({ extras }) => {
  const { adapters } = extras;

  multiplayerClient.connect();

  await widelog.context(async () => {
    widelog.set("event_name", "platform_bridge.startup");
    widelog.set("adapter_count", adapters.length);
    widelog.time.start("duration_ms");

    let started = 0;
    let failed = 0;

    for (const adapter of adapters) {
      try {
        await adapter.initialize();
        await adapter.startListening((message) => messageRouter.handleIncomingMessage(message));
        started++;
      } catch (error) {
        failed++;
        widelog.set(
          `adapter_error.${adapter.platform}`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    widelog.set("adapters_started", started);
    widelog.set("adapters_failed", failed);
    widelog.set("outcome", failed > 0 ? "completed_with_errors" : "success");
    widelog.time.stop("duration_ms");
    widelog.flush();
  });

  const cleanupInterval = setInterval(() => {
    widelog.context(async () => {
      widelog.set("event_name", "platform_bridge.stale_cleanup");
      widelog.time.start("duration_ms");

      try {
        const cleaned = await sessionTracker.cleanupStaleMappings();
        widelog.set("cleaned_count", cleaned);
        widelog.set("outcome", "success");
      } catch (error) {
        widelog.set("outcome", "error");
        widelog.set("error_message", error instanceof Error ? error.message : String(error));
      } finally {
        widelog.time.stop("duration_ms");
        widelog.flush();
      }
    });
  }, 3600000);

  return () => {
    clearInterval(cleanupInterval);

    for (const adapter of getAllAdapters()) {
      try {
        adapter.stopListening();
      } catch {
        // Adapter stop errors are non-critical during shutdown
      }
    }

    responseSubscriber.unsubscribeAll();
    multiplayerClient.disconnect();
  };
}) satisfies MainFunction;
