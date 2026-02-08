import { widelogger } from "@lab/widelogger";

const serviceVersion = process.env.API_VERSION ?? process.env.npm_package_version;
const commitHash =
  process.env.COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA;
const instanceId = process.env.INSTANCE_ID ?? process.env.HOSTNAME ?? String(process.pid);

export const { widelog } = widelogger({
  service: "platform-bridge",
  defaultEventName: "platform_bridge.operation",
  version: serviceVersion,
  commitHash,
  instanceId,
});
