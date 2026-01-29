import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DockerClient } from "@lab/sandbox-docker";
import type { ToolContext } from "./tools/types";

export type ToolRegistrar = (ctx: ToolContext) => void;

export function makeRegisterTool(server: McpServer, docker: DockerClient) {
  const ctx: ToolContext = { docker };

  return {
    registerTool(registrar: (server: McpServer, ctx: ToolContext) => void) {
      registrar(server, ctx);
    },
  };
}

export { listContainers } from "./tools/list-containers";
export { execContainer } from "./tools/exec-container";
export { getContainerLogs } from "./tools/get-container-logs";
export { inspectContainer } from "./tools/inspect-container";
