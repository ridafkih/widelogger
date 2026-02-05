import { findSessionById, updateSessionFields } from "../repositories/session.repository";
import { getProjectSystemPrompt } from "../repositories/project.repository";
import { resolveWorkspacePathBySession } from "../shared/path-resolver";
import { setLastMessage } from "../state/last-message-store";
import { createPromptContext } from "../prompts/context";
import { createDefaultPromptService } from "../prompts/builder";
import type { OpencodeClient, Publisher } from "../types/dependencies";

export interface InitiateConversationOptions {
  sessionId: string;
  task: string;
  modelId?: string;
  opencode: OpencodeClient;
  publisher: Publisher;
}

async function composeSystemPrompt(sessionId: string): Promise<string | undefined> {
  const session = await findSessionById(sessionId);
  if (!session) return undefined;

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

export async function initiateConversation(options: InitiateConversationOptions): Promise<void> {
  const { sessionId, task, opencode, publisher } = options;
  const modelId = options.modelId ?? getDefaultModelId();
  const workspacePath = await resolveWorkspacePathBySession(sessionId);

  const createResponse = await opencode.session.create({ directory: workspacePath });
  if (createResponse.error || !createResponse.data) {
    throw new Error(`Failed to create OpenCode session: ${JSON.stringify(createResponse.error)}`);
  }

  const opencodeSessionId = createResponse.data.id;
  await updateSessionFields(sessionId, { opencodeSessionId, workspaceDirectory: workspacePath });

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

  if (promptResponse.error) {
    throw new Error(`Failed to send initial message: ${JSON.stringify(promptResponse.error)}`);
  }

  setLastMessage(sessionId, task);
  publisher.publishDelta("sessionMetadata", { uuid: sessionId }, { lastMessage: task });
}
