"use client";

import { createContext, use, useState, type ReactNode } from "react";
import { TextAreaGroup } from "./textarea-group";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ChatState = {
  messages: ChatMessage[];
  input: string;
};

type ChatActions = {
  setInput: (value: string) => void;
  send: () => void;
};

type ChatContextValue = {
  state: ChatState;
  actions: ChatActions;
};

const ChatContext = createContext<ChatContextValue | null>(null);

function useChat() {
  const context = use(ChatContext);
  if (!context) {
    throw new Error("Chat components must be used within Chat.Provider");
  }
  return context;
}

type ProviderProps = {
  children: ReactNode;
  initialMessages?: ChatMessage[];
  onSend?: (message: string) => void;
};

function ChatProvider({ children, initialMessages = [], onSend }: ProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    onSend?.(input);
  };

  return (
    <ChatContext value={{ state: { messages, input }, actions: { setInput, send } }}>
      {children}
    </ChatContext>
  );
}

type FrameProps = {
  children: ReactNode;
};

function ChatFrame({ children }: FrameProps) {
  return <div className="flex flex-col h-full">{children}</div>;
}

type HeaderProps = {
  children: ReactNode;
};

function ChatHeader({ children }: HeaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">{children}</div>
  );
}

function ChatHeaderBreadcrumb({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}

function ChatHeaderProject({ children }: { children: ReactNode }) {
  return <span className="text-text-muted">{children}</span>;
}

function ChatHeaderDivider() {
  return <span className="text-text-muted">/</span>;
}

function ChatHeaderTitle({ children }: { children: ReactNode }) {
  return <span className="text-text font-medium">{children}</span>;
}

function ChatMessages() {
  const { state } = useChat();

  if (state.messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        Start a conversation
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-6">
        {state.messages.map((message) => (
          <ChatMessage key={message.id} role={message.role} content={message.content} />
        ))}
      </div>
    </div>
  );
}

type MessageProps = {
  role: ChatRole;
  content: string;
};

function ChatMessage({ role, content }: MessageProps) {
  return (
    <div>
      <span className="text-xs text-text-muted">{role === "user" ? "You" : "Assistant"}</span>
      <p className="mt-1 text-sm text-text whitespace-pre-wrap">{content}</p>
    </div>
  );
}

type InputProps = {
  children?: ReactNode;
};

function ChatInput({ children }: InputProps) {
  const { state, actions } = useChat();

  return (
    <div className="p-4 pt-0">
      <TextAreaGroup.Provider
        state={{ value: state.input }}
        actions={{
          onChange: actions.setInput,
          onSubmit: actions.send,
        }}
      >
        <TextAreaGroup.Frame>
          <TextAreaGroup.Input placeholder="Send a message..." rows={2} />
          <TextAreaGroup.Toolbar>
            {children}
            <TextAreaGroup.Submit />
          </TextAreaGroup.Toolbar>
        </TextAreaGroup.Frame>
      </TextAreaGroup.Provider>
    </div>
  );
}

const Chat = {
  Provider: ChatProvider,
  Frame: ChatFrame,
  Header: ChatHeader,
  HeaderBreadcrumb: ChatHeaderBreadcrumb,
  HeaderProject: ChatHeaderProject,
  HeaderDivider: ChatHeaderDivider,
  HeaderTitle: ChatHeaderTitle,
  Messages: ChatMessages,
  Message: ChatMessage,
  Input: ChatInput,
};

export { Chat, useChat, type ChatMessage, type ChatRole };
