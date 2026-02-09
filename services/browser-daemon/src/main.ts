import type { env } from "./env";
import { widelog } from "./logging";
import type { setup } from "./setup";

interface MainOptions {
  env: (typeof env)["inferOut"];
  extras: ReturnType<typeof setup>;
}

type MainFunction = (options: MainOptions) => unknown;

export const main = (({ env, extras }) => {
  const { server, daemonManager } = extras;

  server.start(env.BROWSER_API_PORT);

  widelog.context(() => {
    widelog.set("event_name", "browser_daemon.startup");
    widelog.set("port", env.BROWSER_API_PORT);
    widelog.flush();
  });

  return () => {
    widelog.context(() => {
      widelog.set("event_name", "browser_daemon.shutdown");
      widelog.flush();
    });
    daemonManager.stopAll();
    server.shutdown();
  };
}) satisfies MainFunction;
