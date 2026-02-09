import { type AppSchema, schema } from "@lab/multiplayer-sdk";
import {
  createSnapshotLoaders,
  type SnapshotLoaderDeps,
} from "./snapshot-loaders";

type ChannelName = keyof AppSchema["channels"];

function isChannelName(name: string): name is ChannelName {
  return name in schema.channels;
}

export function createChannelRestHandler(deps: SnapshotLoaderDeps) {
  const loaders = createSnapshotLoaders(deps);

  return async (
    channelName: string,
    searchParams: URLSearchParams
  ): Promise<Response> => {
    if (!isChannelName(channelName)) {
      return Response.json({ error: "Unknown channel" }, { status: 404 });
    }

    const session = searchParams.get("session");

    try {
      const data = await loaders[channelName](session);

      if (data === null) {
        return Response.json(
          { error: "Missing session parameter" },
          { status: 400 }
        );
      }

      return Response.json({
        channel: channelName,
        data,
        timestamp: Date.now(),
      });
    } catch {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }
  };
}
