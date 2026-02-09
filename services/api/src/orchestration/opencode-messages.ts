/**
 * Type guards and utilities for Opencode message parsing.
 * Used by orchestration tools that interact with Opencode sessions.
 */

import { MESSAGE_ROLE, type MessageRole } from "../types/message";

export interface MessagePart {
  type: string;
  text?: string;
}

export interface OpencodeMessage {
  info: { role: MessageRole };
  parts: MessagePart[];
}

function isMessagePart(value: unknown): value is MessagePart {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "string"
  );
}

export function isOpencodeMessage(value: unknown): value is OpencodeMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("info" in value && "parts" in value)) {
    return false;
  }

  const info = value.info;
  if (typeof info !== "object" || info === null) {
    return false;
  }
  if (!("role" in info)) {
    return false;
  }
  if (info.role !== MESSAGE_ROLE.USER && info.role !== MESSAGE_ROLE.ASSISTANT) {
    return false;
  }

  const parts = value.parts;
  if (!Array.isArray(parts)) {
    return false;
  }

  return parts.every(isMessagePart);
}

export function extractTextFromParts(parts: MessagePart[]): string {
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .filter((text): text is string => text !== undefined)
    .join("\n");
}
