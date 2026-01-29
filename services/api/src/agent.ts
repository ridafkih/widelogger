import { AgentManager } from "@lab/agent";

const opencodeUrl = process.env.OPENCODE_URL;
if (!opencodeUrl) {
  throw new Error("OPENCODE_URL environment variable is required");
}

export const agentManager = new AgentManager({
  opencodeUrl,
});
