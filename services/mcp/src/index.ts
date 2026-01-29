import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { DockerClient } from "@lab/sandbox-docker";
import {
  makeRegisterTool,
  listContainers,
  execContainer,
  getContainerLogs,
  inspectContainer,
} from "./tools";

const docker = new DockerClient();

const server = new McpServer({
  name: "lab-containers",
  version: "1.0.0",
});

const { registerTool } = makeRegisterTool(server, docker);

registerTool(listContainers);
registerTool(execContainer);
registerTool(getContainerLogs);
registerTool(inspectContainer);

const transport = new WebStandardStreamableHTTPServerTransport();

await server.connect(transport);

const port = process.env.MCP_PORT;
if (!port) {
  throw new Error("MCP_PORT environment variable is required");
}

Bun.serve({
  port: parseInt(port, 10),
  fetch: (request) => transport.handleRequest(request),
});

console.log(`MCP server running on http://localhost:${port}`);
