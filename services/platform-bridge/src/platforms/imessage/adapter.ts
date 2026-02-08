import { widelog } from "../../logging";
import { IMessageSDK, type Message } from "@photon-ai/imessage-kit";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { PlatformAdapter, MessageHandler } from "../types";
import type { OutgoingPlatformMessage, MessageAttachment } from "../../types/messages";
import { config } from "../../config/environment";

export class IMessageAdapter implements PlatformAdapter {
  readonly platform = "imessage" as const;
  readonly messagingMode = "passive" as const;
  private sdk: IMessageSDK | null = null;
  private handler: MessageHandler | null = null;
  private watchedContacts: Set<string>;

  constructor() {
    this.watchedContacts = new Set(config.imessageWatchedContacts);
  }

  async initialize(): Promise<void> {
    return widelog.context(async () => {
      widelog.set("event_name", "imessage.initialized");
      widelog.time.start("duration_ms");

      try {
        if (!config.imessageEnabled) {
          widelog.set("enabled", false);
          widelog.set("outcome", "skipped");
          return;
        }

        this.sdk = new IMessageSDK();
        widelog.set("enabled", true);
        widelog.set("outcome", "success");
      } finally {
        widelog.time.stop("duration_ms");
        widelog.flush();
      }
    });
  }

  async startListening(handler: MessageHandler): Promise<void> {
    return widelog.context(async () => {
      widelog.set("event_name", "imessage.start_listening");
      widelog.time.start("duration_ms");

      try {
        if (!this.sdk) {
          widelog.set("outcome", "error");
          widelog.set("error_message", "not_initialized");
          return;
        }

        this.handler = handler;

        await this.sdk.startWatching({
          onNewMessage: async (message: Message) => {
            return widelog.context(async () => {
              widelog.set("event_name", "imessage.message_received");
              widelog.set("guid", message.guid);
              widelog.set("text_preview", message.text?.slice(0, 50) ?? "");
              widelog.set("is_from_me", message.isFromMe);
              widelog.set("chat_id", message.chatId);

              if (message.isFromMe) {
                widelog.set("outcome", "skipped_from_me");
                widelog.flush();
                return;
              }
              if (!this.shouldMonitor(message.chatId)) {
                widelog.set("outcome", "skipped_not_monitored");
                widelog.flush();
                return;
              }
              if (!this.handler) {
                widelog.set("outcome", "skipped_no_handler");
                widelog.flush();
                return;
              }
              if (!message.text) {
                widelog.set("outcome", "skipped_no_text");
                widelog.flush();
                return;
              }

              try {
                const history = await this.getConversationHistory(message.chatId);

                await this.handler({
                  platform: "imessage",
                  chatId: message.chatId,
                  userId: message.sender,
                  messageId: message.guid,
                  content: message.text,
                  timestamp: new Date(message.date),
                  metadata: {
                    isGroupChat: message.isGroupChat,
                    senderName: message.sender,
                    conversationHistory: history,
                  },
                });

                widelog.set("outcome", "success");
              } catch (error) {
                widelog.set("outcome", "error");
                widelog.errorFields(error);
              } finally {
                widelog.flush();
              }
            });
          },
          onGroupMessage: async (message: Message) => {
            return widelog.context(async () => {
              widelog.set("event_name", "imessage.group_message_received");
              widelog.set("guid", message.guid);
              widelog.set("text_preview", message.text?.slice(0, 50) ?? "");
              widelog.set("is_from_me", message.isFromMe);
              widelog.set("chat_id", message.chatId);

              if (message.isFromMe) {
                widelog.set("outcome", "skipped_from_me");
                widelog.flush();
                return;
              }
              if (!this.shouldMonitor(message.chatId)) {
                widelog.set("outcome", "skipped_not_monitored");
                widelog.flush();
                return;
              }
              if (!this.handler) {
                widelog.set("outcome", "skipped_no_handler");
                widelog.flush();
                return;
              }
              if (!message.text) {
                widelog.set("outcome", "skipped_no_text");
                widelog.flush();
                return;
              }

              try {
                const history = await this.getConversationHistory(message.chatId);

                await this.handler({
                  platform: "imessage",
                  chatId: message.chatId,
                  userId: message.sender,
                  messageId: message.guid,
                  content: message.text,
                  timestamp: new Date(message.date),
                  metadata: {
                    isGroupChat: message.isGroupChat,
                    senderName: message.sender,
                    conversationHistory: history,
                  },
                });

                widelog.set("outcome", "success");
              } catch (error) {
                widelog.set("outcome", "error");
                widelog.errorFields(error);
              } finally {
                widelog.flush();
              }
            });
          },
          onError: (error: Error) => {
            widelog.context(() => {
              widelog.set("event_name", "imessage.sdk_error");
              widelog.set("platform", this.platform);
              widelog.set("watched_contacts", this.watchedContacts.size);
              widelog.set("has_handler", !!this.handler);
              widelog.set("outcome", "error");
              widelog.set("error_message", error.message);
              widelog.flush();
            });
          },
        });

        widelog.set("outcome", "success");
        if (this.watchedContacts.size > 0) {
          widelog.set("filtering_contacts", true);
          widelog.set("contacts", Array.from(this.watchedContacts).join(","));
        }
      } finally {
        widelog.time.stop("duration_ms");
        widelog.flush();
      }
    });
  }

  async stopListening(): Promise<void> {
    if (this.sdk) {
      this.sdk.stopWatching();
      await this.sdk.close();
    }
    this.handler = null;
  }

  async sendMessage(message: OutgoingPlatformMessage): Promise<void> {
    if (!this.sdk) {
      throw new Error("iMessage adapter not initialized");
    }

    return widelog.context(async () => {
      widelog.set("event_name", "imessage.message_sent");
      widelog.set("chat_id", message.chatId);
      widelog.time.start("duration_ms");

      const attachmentPaths: string[] = [];

      try {
        if (message.attachments && message.attachments.length > 0) {
          for (const attachment of message.attachments) {
            const filePath = await this.writeAttachmentToTempFile(attachment);
            attachmentPaths.push(filePath);
          }
          widelog.set("attachment_count", attachmentPaths.length);
        }

        if (attachmentPaths.length > 0) {
          await this.sdk!.send(message.chatId, {
            text: message.content || undefined,
            images: attachmentPaths,
          });
        } else {
          await this.sdk!.send(message.chatId, message.content);
        }

        widelog.set("outcome", "success");
      } catch (error) {
        widelog.set("outcome", "error");
        widelog.errorFields(error);
        throw error;
      } finally {
        for (const filePath of attachmentPaths) {
          try {
            await unlink(filePath);
          } catch {
            widelog.set("temp_file_cleanup_failed", true);
          }
        }
        widelog.time.stop("duration_ms");
        widelog.flush();
      }
    });
  }

  private async writeAttachmentToTempFile(attachment: MessageAttachment): Promise<string> {
    const tempDir = join(tmpdir(), "lab-imessage-attachments");
    await mkdir(tempDir, { recursive: true });

    let buffer: Buffer;
    let extension: string;

    if (attachment.type === "image_url") {
      // Fetch image from URL
      const response = await fetch(attachment.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);

      // Determine extension from content-type or URL
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("png")) {
        extension = "png";
      } else if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
        extension = "jpg";
      } else if (contentType?.includes("webp")) {
        extension = "webp";
      } else {
        // Fallback: try to get from URL
        const urlPath = new URL(attachment.url).pathname;
        extension = urlPath.split(".").pop() || "png";
      }
    } else {
      // Base64 encoded image
      extension = attachment.format === "png" ? "png" : attachment.format;
      buffer = Buffer.from(attachment.data, attachment.encoding);
    }

    const fileName = `${randomUUID()}.${extension}`;
    const filePath = join(tempDir, fileName);
    await writeFile(filePath, buffer);

    return filePath;
  }

  shouldMonitor(chatId: string): boolean {
    if (this.watchedContacts.size === 0) return true;
    return this.watchedContacts.has(chatId);
  }

  private async getConversationHistory(chatId: string): Promise<string[]> {
    if (!this.sdk) return [];

    const result = await this.sdk.getMessages({
      chatId,
      limit: config.imessageContextMessages,
    });

    return result.messages.map((msg) => `${msg.isFromMe ? "Me" : msg.sender}: ${msg.text}`);
  }
}

export const imessageAdapter = new IMessageAdapter();
