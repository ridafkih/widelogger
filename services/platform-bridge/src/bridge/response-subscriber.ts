import { multiplayerClient } from "../clients/multiplayer";
import { completionListener } from "./completion-listener";
import { getAdapter } from "../platforms";
import type { PlatformType, SessionMessage, MessagingMode } from "../types/messages";

interface SubscriptionInfo {
  platform: PlatformType;
  chatId: string;
  threadId?: string;
  messagingMode: MessagingMode;
  unsubscribe: () => void;
}

export class ResponseSubscriber {
  private subscriptions = new Map<string, SubscriptionInfo>();

  subscribeToSession(
    sessionId: string,
    platform: PlatformType,
    chatId: string,
    threadId: string | undefined,
    messagingMode: MessagingMode = "passive",
  ): void {
    if (this.subscriptions.has(sessionId)) {
      const existing = this.subscriptions.get(sessionId)!;
      if (existing.platform === platform && existing.chatId === chatId) {
        return;
      }
      existing.unsubscribe();
    }

    const unsubscribe = multiplayerClient.subscribeToSession(sessionId, (message) => {
      this.handleSessionMessage(sessionId, message);
    });

    this.subscriptions.set(sessionId, { platform, chatId, threadId, messagingMode, unsubscribe });

    if (messagingMode === "passive") {
      completionListener.subscribeToSession(sessionId);
    }

    console.log(
      `[ResponseSubscriber] Subscribed to session ${sessionId} for ${platform}:${chatId} (mode: ${messagingMode}, thread: ${threadId ?? "none"})`,
    );
  }

  unsubscribeFromSession(sessionId: string): void {
    const subscription = this.subscriptions.get(sessionId);
    if (subscription) {
      subscription.unsubscribe();
      if (subscription.messagingMode === "passive") {
        completionListener.unsubscribeFromSession(sessionId);
      }
      this.subscriptions.delete(sessionId);
      console.log(`[ResponseSubscriber] Unsubscribed from session ${sessionId}`);
    }
  }

  private async handleSessionMessage(sessionId: string, message: SessionMessage): Promise<void> {
    if (message.role !== "assistant") return;

    const subscription = this.subscriptions.get(sessionId);
    if (!subscription) return;

    if (subscription.messagingMode === "passive") {
      console.log(
        `[ResponseSubscriber] Skipping message for passive session ${sessionId} - will send summary on completion`,
      );
      return;
    }

    const adapter = getAdapter(subscription.platform);
    if (!adapter) {
      console.warn(`[ResponseSubscriber] No adapter for platform ${subscription.platform}`);
      return;
    }

    try {
      await adapter.sendMessage({
        platform: subscription.platform,
        chatId: subscription.chatId,
        content: message.content,
        threadId: subscription.threadId,
      });
      console.log(
        `[ResponseSubscriber] Sent response to ${subscription.platform}:${subscription.chatId}`,
      );
    } catch (error) {
      console.error(`[ResponseSubscriber] Failed to send response:`, error);
    }
  }

  getActiveSubscriptions(): Map<string, { platform: PlatformType; chatId: string }> {
    const result = new Map<string, { platform: PlatformType; chatId: string }>();
    for (const [sessionId, info] of this.subscriptions) {
      result.set(sessionId, { platform: info.platform, chatId: info.chatId });
    }
    return result;
  }

  getThreadId(sessionId: string): string | undefined {
    return this.subscriptions.get(sessionId)?.threadId;
  }

  unsubscribeAll(): void {
    for (const [sessionId, subscription] of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions.clear();
    console.log("[ResponseSubscriber] Unsubscribed from all sessions");
  }
}

export const responseSubscriber = new ResponseSubscriber();
