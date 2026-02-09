import { createDefaultPromptService } from "../prompts/builder";
import { createPromptContext } from "../prompts/context";
import { getProjectSystemPrompt } from "../repositories/project.repository";
import {
  findSessionById,
  updateSessionFields,
} from "../repositories/session.repository";
import { ExternalServiceError, throwOnOpencodeError } from "../shared/errors";
import { resolveWorkspacePathBySession } from "../shared/path-resolver";
import type { SessionStateStore } from "../state/session-state-store";
import type { OpencodeClient, Publisher } from "../types/dependencies";

interface InitiateConversationOptions {
  sessionId: string;
  task: string;
  modelId?: string;
  opencode: OpencodeClient;
  publisher: Publisher;
  sessionStateStore: SessionStateStore;
}

async function composeSystemPrompt(
  sessionId: string
): Promise<string | undefined> {
  const session = await findSessionById(sessionId);
  if (!session) {
    return undefined;
  }

  const projectSystemPrompt = await getProjectSystemPrompt(session.projectId);

  const promptContext = createPromptContext({
    sessionId,
    projectId: session.projectId,
    projectSystemPrompt,
  });

  const promptService = createDefaultPromptService();
  const { text } = promptService.compose(promptContext);

  return text || undefined;
}

function getDefaultModelId(): string | undefined {
  return process.env.DEFAULT_CONVERSATION_MODEL_ID;
}

export async function initiateConversation(
  options: InitiateConversationOptions
): Promise<void> {
  const { sessionId, task, opencode, publisher, sessionStateStore } = options;
  const modelId = options.modelId ?? getDefaultModelId();
  const workspacePath = await resolveWorkspacePathBySession(sessionId);

  const createResponse = await opencode.session.create({
    directory: workspacePath,
  });
  if (createResponse.error || !createResponse.data) {
    throw new ExternalServiceError(
      `Failed to create OpenCode session: ${JSON.stringify(createResponse.error)}`,
      "OPENCODE_SESSION_CREATE_FAILED"
    );
  }

  const opencodeSessionId = createResponse.data.id;
  await updateSessionFields(sessionId, {
    opencodeSessionId,
    workspaceDirectory: workspacePath,
  });

  const [providerID, modelID] = modelId?.split("/") ?? [];
  const system = await composeSystemPrompt(sessionId);

  const promptResponse = await opencode.session.promptAsync({
    sessionID: opencodeSessionId,
    directory: workspacePath,
    model: providerID && modelID ? { providerID, modelID } : undefined,
    parts: [{ type: "text", text: task }],
    system,
    tools: { question: false, bash: false },
  });

  throwOnOpencodeError(
    promptResponse,
    "Failed to send initial message",
    "OPENCODE_INITIAL_PROMPT_FAILED"
  );

  await sessionStateStore.setLastMessage(sessionId, task);
  publisher.publishDelta(
    "sessionMetadata",
    { uuid: sessionId },
    { lastMessage: task }
  );
}
