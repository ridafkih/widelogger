import { generateText, stepCountIs } from "ai";
import type { ExecutionStep } from "../types";
import { buildBrowserAgentPrompt } from "./prompt";
import { createBrowserTools } from "./tools";
import type { BrowserAgentContext } from "./types";

export interface AgentLoopParams {
  sessionId: string;
  objective: string;
  context: BrowserAgentContext;
  trace: ExecutionStep[];
  maxSteps: number;
}

export interface AgentLoopResult {
  summary: string;
}

export async function runAgentLoop(
  params: AgentLoopParams
): Promise<AgentLoopResult> {
  const { sessionId, objective, context, trace, maxSteps } = params;

  const model = context.createModel();
  const tools = createBrowserTools(sessionId, context, trace);

  const systemPrompt = buildBrowserAgentPrompt(objective);

  const { text } = await generateText({
    model,
    tools,
    system: systemPrompt,
    prompt: `Objective: ${objective}\n\nBegin by analyzing what steps are needed to accomplish this objective, then execute them.`,
    stopWhen: stepCountIs(maxSteps),
  });

  return { summary: text };
}
