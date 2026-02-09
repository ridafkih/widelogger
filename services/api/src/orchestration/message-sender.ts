import { throwOnOpencodeError } from "../shared/errors";
import { resolveWorkspacePathBySession } from "../shared/path-resolver";
import type { SessionStateStore } from "../state/session-state-store";
import type { OpencodeClient, Publisher } from "../types/dependencies";

interface SendMessageOptions {
  sessionId: string;
  opencodeSessionId: string;
  content: string;
  modelId?: string;
  opencode: OpencodeClient;
  publisher: Publisher;
  sessionStateStore: SessionStateStore;
}

export async function sendMessageToSession(
  options: SendMessageOptions
): Promise<void> {
  const {
    sessionId,
    opencodeSessionId,
    content,
    modelId,
    opencode,
    publisher,
    sessionStateStore,
  } = options;

  const workspacePath = await resolveWorkspacePathBySession(sessionId);
  const [providerID, modelID] = modelId?.split("/") ?? [];

  const promptResponse = await opencode.session.promptAsync({
    sessionID: opencodeSessionId,
    directory: workspacePath,
    model: providerID && modelID ? { providerID, modelID } : undefined,
    parts: [{ type: "text", text: content }],
  });

  throwOnOpencodeError(
    promptResponse,
    "Failed to send message to session",
    "OPENCODE_PROMPT_FAILED"
  );

  await sessionStateStore.setLastMessage(sessionId, content);
  publisher.publishDelta(
    "sessionMetadata",
    { uuid: sessionId },
    { lastMessage: content }
  );
}
