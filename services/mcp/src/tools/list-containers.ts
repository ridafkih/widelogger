import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./types";

export function listContainers(server: McpServer, { docker }: ToolContext) {
  server.registerTool(
    "container_list",
    { description: "List all running Docker containers" },
    async () => {
      const containers = await docker.raw.listContainers({ all: false });

      const result = containers.map((c) => ({
        id: c.Id.slice(0, 12),
        names: c.Names,
        image: c.Image,
        state: c.State,
        status: c.Status,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
