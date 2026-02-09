import { generateText, stepCountIs, streamText } from "ai";
import { widelog } from "../../logging";
import { breakDoubleNewlines } from "../../shared/streaming";
import { extractSessionInfoFromSteps } from "../tool-result-handler";
import { buildOrchestratorResult, prepareOrchestration } from "./pipeline";
import type {
  ChatOrchestratorChunk,
  ChatOrchestratorInput,
  ChatOrchestratorResult,
} from "./types";

export async function chatOrchestrate(
  input: ChatOrchestratorInput
): Promise<ChatOrchestratorResult> {
  const { model, tools, systemPrompt, platformConfig } =
    await prepareOrchestration(input);
  if (input.platformOrigin) {
    widelog.set("orchestration.platform_origin", input.platformOrigin);
  }
  widelog.set(
    "orchestration.break_double_newlines",
    platformConfig.breakDoubleNewlines
  );

  let text: string;
  let messages: string[] | undefined;
  let sessionInfo: ReturnType<typeof extractSessionInfoFromSteps>;

  if (platformConfig.breakDoubleNewlines) {
    // Stream and break on double newlines for platforms like iMessage
    const result = streamText({
      model,
      tools,
      prompt: input.content,
      system: systemPrompt,
      stopWhen: stepCountIs(5),
    });

    const collectedMessages: string[] = [];
    for await (const chunk of breakDoubleNewlines(result.textStream)) {
      widelog.count("orchestration.chunk_count");
      widelog.max("orchestration.max_chunk_length", chunk.length);
      collectedMessages.push(chunk);
    }
    widelog.set("orchestration.total_chunks", collectedMessages.length);

    // Wait for completion to get steps for session info extraction
    const finalResult = await result;
    text = collectedMessages.join("\n\n");
    messages = collectedMessages.length > 1 ? collectedMessages : undefined;
    sessionInfo = extractSessionInfoFromSteps(await finalResult.steps);
  } else {
    // Standard non-streaming generation
    const result = await generateText({
      model,
      tools,
      prompt: input.content,
      system: systemPrompt,
      stopWhen: stepCountIs(5),
    });

    text = result.text;
    sessionInfo = extractSessionInfoFromSteps(result.steps);
  }

  return buildOrchestratorResult(text, messages, sessionInfo);
}

/**
 * Streaming version of chatOrchestrate that yields chunks as they're detected.
 * Used for real-time delivery to platforms like iMessage.
 */
export async function* chatOrchestrateStream(
  input: ChatOrchestratorInput
): AsyncGenerator<ChatOrchestratorChunk, ChatOrchestratorResult, unknown> {
  const { model, tools, systemPrompt } = await prepareOrchestration(input);
  widelog.set("orchestration.stream_enabled", true);
  if (input.platformOrigin) {
    widelog.set("orchestration.platform_origin", input.platformOrigin);
  }

  const result = streamText({
    model,
    tools,
    prompt: input.content,
    system: systemPrompt,
    stopWhen: stepCountIs(5),
  });

  const collectedChunks: string[] = [];
  let buffer = "";
  const delimiter = "\n\n";

  // Helper to flush buffer and yield chunk
  const flushBuffer = function* () {
    // Check for any complete chunks with delimiter
    let delimiterIndex: number;
    while ((delimiterIndex = buffer.indexOf(delimiter)) !== -1) {
      const textBeforeDelimiter = buffer.slice(0, delimiterIndex).trim();
      if (textBeforeDelimiter.length > 0) {
        widelog.count("orchestration.stream_chunk_count");
        widelog.max(
          "orchestration.stream_max_chunk_length",
          textBeforeDelimiter.length
        );
        collectedChunks.push(textBeforeDelimiter);
        yield { type: "chunk" as const, text: textBeforeDelimiter };
      }
      buffer = buffer.slice(delimiterIndex + delimiter.length);
    }
  };

  // Helper to force flush remaining buffer (on tool call or end)
  const forceFlushBuffer = function* () {
    const remaining = buffer.trim();
    if (remaining.length > 0) {
      widelog.count("orchestration.stream_chunk_count");
      widelog.max("orchestration.stream_max_chunk_length", remaining.length);
      collectedChunks.push(remaining);
      yield { type: "chunk" as const, text: remaining };
    }
    buffer = "";
  };

  // Use fullStream to detect both text and tool calls
  for await (const event of result.fullStream) {
    if (event.type === "text-delta") {
      buffer += event.text;
      // Yield any complete chunks (split on delimiter)
      yield* flushBuffer();
    } else if (event.type === "tool-call") {
      // Flush any pending text before tool execution
      yield* forceFlushBuffer();
      widelog.count("orchestration.stream_tool_call_count");
      widelog.append("orchestration.stream_tool_calls", event.toolName);
    }
  }

  // Flush any remaining text after stream ends
  yield* forceFlushBuffer();

  widelog.set("orchestration.stream_total_chunks", collectedChunks.length);

  // Wait for completion to get steps for session info extraction
  const finalResult = await result;
  const text = collectedChunks.join("\n\n");
  const messages = collectedChunks.length > 1 ? collectedChunks : undefined;
  const sessionInfo = extractSessionInfoFromSteps(await finalResult.steps);

  return buildOrchestratorResult(text, messages, sessionInfo);
}
