import { widelogger } from "widelogger";

export const { context, destroy } = widelogger({
  service: "example-api",
  defaultEventName: "http_request",
  version: "1.0.0",
  commitHash: process.env.COMMIT_SHA,
});
