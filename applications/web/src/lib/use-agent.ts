"use client";

import type {
  AssistantMessage,
  Message,
  Part,
} from "@opencode-ai/sdk/v2/client";
import { useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { api } from "./api";
import { type Event, useOpenCodeSession } from "./opencode-session";
import type { Attachment } from "./use-attachments";
import { createSessionClient, useSessionClient } from "./use-session-client";

interface LoadedMessage {
  info: Message;
  parts: Part[];
}

export interface MessageState {
  id: string;
  role: "user" | "assistant";
  parts: Part[];
}

interface SendMessageOptions {
  content: string;
  modelId?: string;
  attachments?: Attachment[];
}

export type SessionStatus =
  | { type: "idle" }
  | { type: "busy" }
  | { type: "retry"; attempt: number; message: string; next: number }
  | {
      type: "error";
      message?: string;
      isRetryable?: boolean;
      statusCode?: number;
    };

interface UseAgentResult {
  isLoading: boolean;
  messages: MessageState[];
  error: Error | null;
  sendMessage: (options: SendMessageOptions) => Promise<void>;
  abortSession: () => Promise<void>;
  isSending: boolean;
  sessionStatus: SessionStatus;
  questionRequests: Map<string, string>;
}

interface SessionData {
  opencodeSessionId: string;
  messages: MessageState[];
}

function parseLoadedMessages(data: LoadedMessage[]): MessageState[] {
  return data.map((message) => ({
    id: message.info.id,
    role: message.info.role,
    parts: message.parts,
  }));
}

function getSessionIdFromEvent(event: Event): string | undefined {
  if (!("properties" in event)) {
    return undefined;
  }

  const properties = event.properties;

  if ("sessionID" in properties && typeof properties.sessionID === "string") {
    return properties.sessionID;
  }

  if (
    "info" in properties &&
    typeof properties.info === "object" &&
    properties.info !== null
  ) {
    const info = properties.info;
    if ("sessionID" in info && typeof info.sessionID === "string") {
      return info.sessionID;
    }
  }

  if (
    "part" in properties &&
    typeof properties.part === "object" &&
    properties.part !== null
  ) {
    const part = properties.part;
    if ("sessionID" in part && typeof part.sessionID === "string") {
      return part.sessionID;
    }
  }

  return undefined;
}

function sortPartsById(parts: Part[]): Part[] {
  return parts.toSorted((partA, partB) => partA.id.localeCompare(partB.id));
}

function upsertPart(parts: Part[], part: Part): Part[] {
  const existingIndex = parts.findIndex((existing) => existing.id === part.id);
  if (existingIndex === -1) {
    return [...parts, part];
  }
  return parts.map((existing, index) =>
    index === existingIndex ? part : existing
  );
}

interface PendingQuestion {
  callID: string;
  requestID: string;
}

function extractPendingQuestion(question: unknown): PendingQuestion | null {
  if (typeof question !== "object" || question === null) {
    return null;
  }

  if (!("id" in question) || typeof question.id !== "string") {
    return null;
  }

  if (
    !("tool" in question) ||
    typeof question.tool !== "object" ||
    question.tool === null
  ) {
    return null;
  }

  if (
    !("callID" in question.tool) ||
    typeof question.tool.callID !== "string"
  ) {
    return null;
  }

  return { callID: question.tool.callID, requestID: question.id };
}

function extractQuestionAskedEvent(
  event: Event
): { callID: string; requestID: string } | null {
  if (!("properties" in event)) {
    return null;
  }
  const properties = event.properties;
  if (typeof properties !== "object" || properties === null) {
    return null;
  }
  if (!("callID" in properties) || typeof properties.callID !== "string") {
    return null;
  }
  if (
    !("requestID" in properties) ||
    typeof properties.requestID !== "string"
  ) {
    return null;
  }
  return { callID: properties.callID, requestID: properties.requestID };
}

function extractQuestionCallID(event: Event): string | null {
  if (!("properties" in event)) {
    return null;
  }
  const properties = event.properties;
  if (typeof properties !== "object" || properties === null) {
    return null;
  }
  if (!("callID" in properties) || typeof properties.callID !== "string") {
    return null;
  }
  return properties.callID;
}

interface MessageError {
  message: string;
  isRetryable: boolean;
  statusCode?: number;
}

function extractMessageError(info: Message): MessageError | null {
  if (info.role !== "assistant") {
    return null;
  }
  const assistantMessage = info as AssistantMessage;
  if (!assistantMessage.error) {
    return null;
  }

  const error = assistantMessage.error;
  const message =
    "message" in error.data && typeof error.data.message === "string"
      ? error.data.message
      : "An error occurred";

  return {
    message,
    isRetryable: error.name === "APIError" ? error.data.isRetryable : true,
    statusCode: error.name === "APIError" ? error.data.statusCode : undefined,
  };
}

async function fetchPendingQuestions(
  labSessionId: string
): Promise<PendingQuestion[]> {
  const client = createSessionClient(labSessionId);
  const response = await client.question.list();
  if (response.error || !response.data) {
    return [];
  }

  const pendingQuestions: PendingQuestion[] = [];
  for (const question of response.data) {
    const extracted = extractPendingQuestion(question);
    if (extracted) {
      pendingQuestions.push(extracted);
    }
  }
  return pendingQuestions;
}

async function fetchSessionData(
  labSessionId: string
): Promise<SessionData | null> {
  const client = createSessionClient(labSessionId);
  const labSession = await api.sessions.get(labSessionId);

  let opencodeSessionId = labSession.opencodeSessionId;

  if (!opencodeSessionId) {
    const response = await client.session.create({});
    if (response.error || !response.data) {
      throw new Error("Failed to create OpenCode session");
    }
    opencodeSessionId = response.data.id;
  }

  const messagesResponse = await client.session.messages({
    sessionID: opencodeSessionId,
  });

  if (messagesResponse.error) {
    throw new Error(
      `Failed to fetch messages: ${JSON.stringify(messagesResponse.error)}`
    );
  }

  return {
    opencodeSessionId,
    messages: parseLoadedMessages(messagesResponse.data ?? []),
  };
}

function getAgentMessagesKey(labSessionId: string): string {
  return `agent-messages-${labSessionId}`;
}

interface TextPart {
  type: "text";
  text: string;
}
interface FilePart {
  type: "file";
  mime: string;
  url: string;
  filename: string;
}
type MessagePart = TextPart | FilePart;

function attachmentToFilePart(attachment: Attachment): FilePart {
  return {
    type: "file",
    mime: attachment.file.type,
    url: attachment.preview,
    filename: attachment.file.name,
  };
}

function buildMessageParts(
  content: string,
  attachments?: Attachment[]
): MessagePart[] {
  const parts: MessagePart[] = [];

  if (content.trim().length > 0) {
    parts.push({ type: "text", text: content });
  }

  if (attachments && attachments.length > 0) {
    const fileParts = attachments.map(attachmentToFilePart);
    parts.push(...fileParts);
  }

  return parts;
}

export function useAgent(labSessionId: string): UseAgentResult {
  const { subscribe } = useOpenCodeSession();
  const { mutate } = useSWRConfig();
  const [streamedMessages, setStreamedMessages] = useState<
    MessageState[] | null
  >(null);
  const [error, setError] = useState<Error | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    type: "idle",
  });
  const [questionRequests, setQuestionRequests] = useState<Map<string, string>>(
    () => new Map()
  );
  const currentOpencodeSessionRef = useRef<string | null>(null);
  const sendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamedMessagesRef = useRef<MessageState[] | null>(null);
  const sessionDataRef = useRef<SessionData | null>(null);
  const opencodeClient = useSessionClient(labSessionId);

  const isOptimistic = labSessionId === "new";

  const {
    data: sessionData,
    error: swrError,
    isLoading,
  } = useSWR<SessionData | null>(
    labSessionId && !isOptimistic ? getAgentMessagesKey(labSessionId) : null,
    () => fetchSessionData(labSessionId)
  );

  const { data: pendingQuestions } = useSWR(
    labSessionId && !isOptimistic ? `pending-questions-${labSessionId}` : null,
    () => fetchPendingQuestions(labSessionId)
  );

  useEffect(() => {
    sessionDataRef.current = sessionData ?? null;
    if (sessionData?.opencodeSessionId) {
      currentOpencodeSessionRef.current = sessionData.opencodeSessionId;
    }
    streamedMessagesRef.current = streamedMessages;
    if (swrError) {
      setError(
        swrError instanceof Error ? swrError : new Error("Failed to initialize")
      );
    }
  }, [sessionData, streamedMessages, swrError]);

  useEffect(() => {
    if (pendingQuestions && pendingQuestions.length > 0) {
      setQuestionRequests(
        new Map(
          pendingQuestions.map((question) => [
            question.callID,
            question.requestID,
          ])
        )
      );
    }
  }, [pendingQuestions]);

  const messages = streamedMessages ?? sessionData?.messages ?? [];
  const opencodeSessionId = sessionData?.opencodeSessionId ?? null;

  useEffect(() => {
    if (!opencodeSessionId) {
      return;
    }

    const handleMessageUpdated = (info: Message) => {
      setStreamedMessages((previous) => {
        const base = previous ?? sessionDataRef.current?.messages ?? [];
        const existing = base.find((message) => message.id === info.id);
        if (existing) {
          return base;
        }
        return [...base, { id: info.id, role: info.role, parts: [] }];
      });

      const messageError = extractMessageError(info);
      if (messageError) {
        setSessionStatus({
          type: "error",
          message: messageError.message,
          isRetryable: messageError.isRetryable,
          statusCode: messageError.statusCode,
        });
        setIsSending(false);
        if (sendingTimeoutRef.current) {
          clearTimeout(sendingTimeoutRef.current);
          sendingTimeoutRef.current = null;
        }
      }
    };

    const handleMessagePartUpdated = (part: Part) => {
      setStreamedMessages((previous) => {
        const base = previous ?? sessionDataRef.current?.messages ?? [];
        return base.map((message) => {
          if (message.id !== part.messageID) {
            return message;
          }
          return {
            ...message,
            parts: sortPartsById(upsertPart(message.parts, part)),
          };
        });
      });
    };

    const clearSendingTimeout = () => {
      if (sendingTimeoutRef.current) {
        clearTimeout(sendingTimeoutRef.current);
        sendingTimeoutRef.current = null;
      }
    };

    const handleSessionIdle = () => {
      clearSendingTimeout();
      setIsSending(false);
      setSessionStatus({ type: "idle" });

      if (streamedMessagesRef.current) {
        mutate(
          getAgentMessagesKey(labSessionId),
          (current: SessionData | null | undefined) => {
            if (!current) {
              return current;
            }
            return {
              ...current,
              messages: streamedMessagesRef.current ?? [],
            };
          },
          { revalidate: false }
        );
      }
      setStreamedMessages(null);
    };

    const handleQuestionAsked = (event: Event) => {
      const extracted = extractQuestionAskedEvent(event);
      if (extracted) {
        setQuestionRequests((previous) =>
          new Map(previous).set(extracted.callID, extracted.requestID)
        );
      }
    };

    const handleQuestionResolved = (event: Event) => {
      const callID = extractQuestionCallID(event);
      if (callID) {
        setQuestionRequests((previous) => {
          const next = new Map(previous);
          next.delete(callID);
          return next;
        });
      }
    };

    const isForCurrentSession = (event: Event): boolean => {
      const sessionSpecificEvents = [
        "message.updated",
        "message.part.updated",
        "session.idle",
        "session.error",
        "session.status",
        "question.asked",
        "question.replied",
        "question.rejected",
      ];

      if (!sessionSpecificEvents.includes(event.type)) {
        return true;
      }
      return getSessionIdFromEvent(event) === currentOpencodeSessionRef.current;
    };

    const handleSessionError = () => {
      clearSendingTimeout();
      setIsSending(false);
      setSessionStatus({ type: "error" });
    };

    const processEvent = (event: Event) => {
      if (!isForCurrentSession(event)) {
        return;
      }

      switch (event.type) {
        case "message.updated":
          handleMessageUpdated(event.properties.info);
          break;
        case "message.part.updated":
          handleMessagePartUpdated(event.properties.part);
          break;
        case "session.status":
          setSessionStatus(event.properties.status);
          break;
        case "session.idle":
          handleSessionIdle();
          break;
        case "session.error":
          handleSessionError();
          break;
        case "question.asked":
          handleQuestionAsked(event);
          break;
        case "question.replied":
        case "question.rejected":
          handleQuestionResolved(event);
          break;
        default:
          break;
      }
    };

    return subscribe(processEvent);
  }, [subscribe, opencodeSessionId, mutate, labSessionId]);

  const sendMessage = async ({
    content,
    modelId,
    attachments,
  }: SendMessageOptions) => {
    if (!(opencodeSessionId && opencodeClient)) {
      throw new Error("Session not initialized");
    }

    setError(null);
    setIsSending(true);

    if (sendingTimeoutRef.current) {
      clearTimeout(sendingTimeoutRef.current);
    }

    sendingTimeoutRef.current = setTimeout(
      () => {
        setIsSending(false);
        sendingTimeoutRef.current = null;
      },
      5 * 60 * 1000
    );

    try {
      const [providerID = "", modelID = ""] = modelId?.split("/") ?? [];
      const parts = buildMessageParts(content, attachments);

      const response = await opencodeClient.session.promptAsync({
        sessionID: opencodeSessionId,
        model: {
          providerID,
          modelID,
        },
        parts,
      });

      if (response.error) {
        throw new Error(
          `Failed to send message: ${JSON.stringify(response.error)}`
        );
      }
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error("Failed to send message");
      setError(errorInstance);
      setIsSending(false);
      throw errorInstance;
    } finally {
      if (sendingTimeoutRef.current) {
        clearTimeout(sendingTimeoutRef.current);
        sendingTimeoutRef.current = null;
      }
    }
  };

  const abortSession = async () => {
    if (!(currentOpencodeSessionRef.current && opencodeClient)) {
      return;
    }

    try {
      await opencodeClient.session.abort({
        sessionID: currentOpencodeSessionRef.current,
      });
    } catch (error) {
      console.warn(error);
    }
  };

  return {
    isLoading,
    messages,
    error,
    sendMessage,
    abortSession,
    isSending,
    sessionStatus,
    questionRequests,
  };
}
