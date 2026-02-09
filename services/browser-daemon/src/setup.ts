import type { env } from "./env";
import { widelog } from "./logging";
import { BrowserDaemonServer } from "./server/browser-daemon-server";
import { createDaemonManager } from "./utils/daemon-manager";

interface SetupOptions {
  env: (typeof env)["inferOut"];
}

type SetupFunction = (options: SetupOptions) => unknown;

export const setup = (({ env }) => {
  const daemonManager = createDaemonManager({
    baseStreamPort: env.AGENT_BROWSER_STREAM_PORT,
    profileDir: env.AGENT_BROWSER_PROFILE_DIR,
  });

  const server = new BrowserDaemonServer({ daemonManager, widelog });

  return { server };
}) satisfies SetupFunction;
