"use client";

import { useEffect } from "react";
import { Chat, useChat } from "@/components/chat";
import { TextAreaGroup } from "@/components/textarea-group";
import { MessagePart } from "@/components/message-part";
import { useModels } from "@/lib/hooks";
import type { MessageState } from "@/lib/use-agent";

type ChatTabContentProps = {
  messages: MessageState[];
};

export function ChatTabContent({ messages }: ChatTabContentProps) {
  const { data: modelGroups } = useModels();
  const { state, actions } = useChat();

  useEffect(() => {
    if (modelGroups && !state.modelId) {
      const firstModel = modelGroups[0]?.models[0];
      if (firstModel) actions.setModelId(firstModel.value);
    }
  }, [modelGroups, state.modelId, actions]);

  return (
    <Chat.MessageList>
      <Chat.Messages>
        {messages.flatMap((message) =>
          message.parts.map((part) => (
            <Chat.Block key={part.id} role={message.role}>
              <MessagePart.Root
                part={part}
                isStreaming={
                  message.role === "assistant" && message === messages[messages.length - 1]
                }
              />
            </Chat.Block>
          )),
        )}
      </Chat.Messages>
      <Chat.Input>
        {modelGroups && state.modelId && (
          <TextAreaGroup.ModelSelector
            value={state.modelId}
            groups={modelGroups}
            onChange={actions.setModelId}
          />
        )}
      </Chat.Input>
    </Chat.MessageList>
  );
}
