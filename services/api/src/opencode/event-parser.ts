interface FileDiff {
  file: string;
  before: string;
  after: string;
  additions: number;
  deletions: number;
}

interface MessagePart {
  type: string;
  text?: string;
}

export interface SessionDiffEvent {
  type: "session.diff";
  properties: { diff: FileDiff[] };
}

interface MessageUpdatedEvent {
  type: "message.updated";
  properties: { parts: MessagePart[] };
}

interface MessagePartUpdatedEvent {
  type: "message.part.updated";
  properties: { part: MessagePart };
}

interface SessionIdleEvent {
  type: "session.idle";
}

interface SessionErrorEvent {
  type: "session.error";
}

type OpenCodeEvent =
  | SessionDiffEvent
  | MessageUpdatedEvent
  | MessagePartUpdatedEvent
  | SessionIdleEvent
  | SessionErrorEvent;

function hasProperty<T extends string>(
  obj: unknown,
  key: T
): obj is Record<T, unknown> {
  return typeof obj === "object" && obj !== null && key in obj;
}

function parseSessionDiffEvent(event: unknown): SessionDiffEvent | null {
  if (!hasProperty(event, "type") || event.type !== "session.diff") {
    return null;
  }
  if (!hasProperty(event, "properties")) {
    return null;
  }
  if (!hasProperty(event.properties, "diff")) {
    return null;
  }
  if (!Array.isArray(event.properties.diff)) {
    return null;
  }
  return { type: "session.diff", properties: { diff: event.properties.diff } };
}

function parseMessageUpdatedEvent(event: unknown): MessageUpdatedEvent | null {
  if (!hasProperty(event, "type") || event.type !== "message.updated") {
    return null;
  }
  if (!hasProperty(event, "properties")) {
    return null;
  }
  if (!hasProperty(event.properties, "parts")) {
    return null;
  }
  if (!Array.isArray(event.properties.parts)) {
    return null;
  }
  return {
    type: "message.updated",
    properties: { parts: event.properties.parts },
  };
}

function parseMessagePartUpdatedEvent(
  event: unknown
): MessagePartUpdatedEvent | null {
  if (!hasProperty(event, "type") || event.type !== "message.part.updated") {
    return null;
  }
  if (!hasProperty(event, "properties")) {
    return null;
  }
  if (!hasProperty(event.properties, "part")) {
    return null;
  }
  const part = event.properties.part;
  if (typeof part !== "object" || part === null) {
    return null;
  }
  if (!hasProperty(part, "type") || typeof part.type !== "string") {
    return null;
  }
  return {
    type: "message.part.updated",
    properties: {
      part: {
        type: part.type,
        text:
          hasProperty(part, "text") && typeof part.text === "string"
            ? part.text
            : undefined,
      },
    },
  };
}

function parseSessionIdleEvent(event: unknown): SessionIdleEvent | null {
  if (!hasProperty(event, "type") || event.type !== "session.idle") {
    return null;
  }
  return { type: "session.idle" };
}

function parseSessionErrorEvent(event: unknown): SessionErrorEvent | null {
  if (!hasProperty(event, "type") || event.type !== "session.error") {
    return null;
  }
  return { type: "session.error" };
}

export function parseEvent(event: unknown): OpenCodeEvent | null {
  return (
    parseSessionDiffEvent(event) ??
    parseMessageUpdatedEvent(event) ??
    parseMessagePartUpdatedEvent(event) ??
    parseSessionIdleEvent(event) ??
    parseSessionErrorEvent(event)
  );
}

export function extractTextFromParts(parts: MessagePart[]): string | null {
  const textPart = parts.find((part) => part.type === "text" && part.text);
  return textPart?.text ?? null;
}
