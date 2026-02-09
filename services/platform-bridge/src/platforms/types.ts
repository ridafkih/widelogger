import type {
  IncomingPlatformMessage,
  OutgoingPlatformMessage,
  PlatformType,
} from "../types/messages";

export type MessagingMode = "active" | "passive";

export type MessageHandler = (
  message: IncomingPlatformMessage
) => Promise<void>;

export interface PlatformAdapter {
  readonly platform: PlatformType;
  readonly messagingMode: MessagingMode;

  initialize(): Promise<void>;

  startListening(handler: MessageHandler): Promise<void>;

  stopListening(): Promise<void>;

  sendMessage(message: OutgoingPlatformMessage): Promise<void>;

  shouldMonitor(chatId: string): boolean;
}
