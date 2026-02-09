import type { env } from "./env";

interface SetupOptions {
  env: (typeof env)["inferOut"];
}

type SetupFunction = (options: SetupOptions) => unknown;

export const setup = (({ env }) => {
  return { port: env.PROXY_PORT };
}) satisfies SetupFunction;
