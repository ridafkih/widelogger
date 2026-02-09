"use client";

import { useEffect, useRef, useState } from "react";
import { useSessionContext } from "@/app/editor/[sessionId]/layout";
import { Chat, useChat } from "@/components/chat";
import { MessagePart } from "@/components/message-part";
import { TextAreaGroup } from "@/components/textarea-group";
import { useModelSelection } from "@/lib/hooks";
import { isToolPart } from "@/lib/opencode";
import { QuestionProvider } from "@/lib/question-context";
import type { MessageState, SessionStatus } from "@/lib/use-agent";
import { useSessionStatus } from "@/lib/use-session-status";

function formatErrorMessage(status: SessionStatus): string | null {
  if (status.type !== "error" || !status.message) {
    return null;
  }

  if (status.message.includes("credit balance")) {
    return "Insufficient credits. Please add credits to continue.";
  }
  if (status.statusCode === 429) {
    return "Rate limited. Please wait or try a different model.";
  }

  return status.message;
}

interface ChatTabContentProps {
  messages: MessageState[];
  onQuestionReply: (callId: string, answers: string[][]) => Promise<void>;
  onQuestionReject: (callId: string) => Promise<void>;
  isQuestionSubmitting: boolean;
  sessionStatus: SessionStatus;
  onAbort: () => void;
  questionRequests: Map<string, string>;
}

export function ChatTabContent({
  messages,
  onQuestionReply,
  onQuestionReject,
  isQuestionSubmitting,
  sessionStatus,
  onAbort,
  questionRequests,
}: ChatTabContentProps) {
  const { session } = useSessionContext();
  const status = useSessionStatus(session);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const { scrollToBottom, getModelId, setModelId: setChatModelId } = useChat();
  const { modelGroups, modelId, setModelId } = useModelSelection({
    syncTo: setChatModelId,
    currentSyncedValue: getModelId(),
  });
  const isStreamingRef = useRef(false);

  const lastMessage = messages.at(-1);
  const isStreaming = lastMessage?.role === "assistant";

  const hasRunningTool =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some(
      (part) =>
        isToolPart(part) &&
        (part.state.status === "running" || part.state.status === "pending")
    );

  const isActive =
    status === "generating" || sessionStatus.type === "busy" || hasRunningTool;

  useEffect(() => {
    if (isStreaming) {
      isStreamingRef.current = true;
      scrollToBottom();
    } else if (isStreamingRef.current) {
      isStreamingRef.current = false;
    }
  }, [isStreaming, scrollToBottom]);

  useEffect(() => {
    if (sessionStatus.type === "retry") {
      onAbort();
      setRateLimitMessage("Rate limited. Try a different model.");
    } else if (sessionStatus.type === "error" && sessionStatus.message) {
      setRateLimitMessage(formatErrorMessage(sessionStatus));
    }
  }, [sessionStatus, onAbort]);

  useEffect(() => {
    setRateLimitMessage(null);
  }, []);

  return (
    <QuestionProvider
      isSubmitting={isQuestionSubmitting}
      onReject={onQuestionReject}
      onReply={onQuestionReply}
      questionRequests={questionRequests}
    >
      <Chat.MessageList>
        <Chat.Messages>
          {messages.flatMap((message) =>
            message.parts.map((part) => (
              <Chat.Block key={part.id} role={message.role}>
                <MessagePart.Root
                  isStreaming={
                    message.role === "assistant" && message === messages.at(-1)
                  }
                  part={part}
                />
              </Chat.Block>
            ))
          )}
        </Chat.Messages>
        <Chat.Input isSending={isActive} statusMessage={rateLimitMessage}>
          {modelGroups && modelId && (
            <TextAreaGroup.ModelSelector
              groups={modelGroups}
              onChange={setModelId}
              value={modelId}
            />
          )}
        </Chat.Input>
      </Chat.MessageList>
    </QuestionProvider>
  );
}
