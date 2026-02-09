import type { DockerClient } from "@lab/sandbox-docker";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config, ToolContext } from "../types/tool";

export function makeRegisterTool(
  server: McpServer,
  docker: DockerClient,
  config: Config
) {
  const context: ToolContext = { docker, config };

  return {
    registerTool(registrar: (server: McpServer, context: ToolContext) => void) {
      registrar(server, context);
    },
  };
}
