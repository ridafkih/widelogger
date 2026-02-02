import { streamText, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { publisher } from "../../clients/publisher";
import { updateSessionTitle } from "../repositories/session.repository";

interface ModelConfig {
  provider: string;
  model: string;
  apiKey: string;
}

function getModelConfig(): ModelConfig {
  const provider = process.env.ORCHESTRATOR_MODEL_PROVIDER;
  const model = process.env.ORCHESTRATOR_MODEL_NAME;
  const apiKey = process.env.ORCHESTRATOR_MODEL_API_KEY;

  if (!provider || !model || !apiKey) {
    throw new Error(
      "Missing model config for title generation. Set ORCHESTRATOR_MODEL_PROVIDER, ORCHESTRATOR_MODEL_NAME, and ORCHESTRATOR_MODEL_API_KEY",
    );
  }

  return { provider, model, apiKey };
}

function createModel(config: ModelConfig): LanguageModel {
  switch (config.provider) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: config.apiKey });
      return anthropic(config.model);
    }
    case "openai": {
      const openai = createOpenAI({ apiKey: config.apiKey });
      return openai(config.model);
    }
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

function buildPrompt(userMessage: string): string {
  return `Generate a brief, descriptive title (3-6 words) for a chat session based on the user's initial message. The title should capture the main intent or topic. Do not include quotes or punctuation at the end. Only output the title, nothing else.

User's message: ${userMessage}`;
}

export interface GenerateTitleOptions {
  sessionId: string;
  userMessage: string;
  fallbackTitle?: string;
}

export async function generateSessionTitle(options: GenerateTitleOptions): Promise<string> {
  const { sessionId, userMessage, fallbackTitle } = options;

  try {
    const config = getModelConfig();
    const model = createModel(config);
    const prompt = buildPrompt(userMessage);

    const result = streamText({
      model,
      prompt,
    });

    let accumulatedTitle = "";

    for await (const textPart of result.textStream) {
      accumulatedTitle += textPart;

      publisher.publishDelta(
        "sessionMetadata",
        { uuid: sessionId },
        { title: accumulatedTitle.trim() },
      );
    }

    const finalTitle = accumulatedTitle.trim() || fallbackTitle || "New Session";

    const updatedSession = await updateSessionTitle(sessionId, finalTitle);

    if (updatedSession) {
      publisher.publishDelta("sessions", {
        type: "update",
        session: {
          id: updatedSession.id,
          projectId: updatedSession.projectId,
          title: updatedSession.title,
        },
      });
    }

    return finalTitle;
  } catch (error) {
    console.error(`[TitleGenerator] Failed to generate title for ${sessionId}:`, error);

    const fallback = fallbackTitle || userMessage.slice(0, 50).trim() || "New Session";
    const updatedSession = await updateSessionTitle(sessionId, fallback);

    if (updatedSession) {
      publisher.publishDelta("sessions", {
        type: "update",
        session: {
          id: updatedSession.id,
          projectId: updatedSession.projectId,
          title: updatedSession.title,
        },
      });
    }

    return fallback;
  }
}
