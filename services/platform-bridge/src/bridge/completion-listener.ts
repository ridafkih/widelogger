import { multiplayerClient } from "../clients/multiplayer";
import { apiClient } from "../clients/api";
import { getAdapter } from "../platforms";
import { responseSubscriber } from "./response-subscriber";
import type { PlatformType } from "../types/messages";

interface SessionCompleteEvent {
  sessionId: string;
  completedAt: number;
}

class CompletionListener {
  private processingSet = new Set<string>();
  private unsubscribers = new Map<string, () => void>();

  subscribeToSession(sessionId: string): void {
    if (this.unsubscribers.has(sessionId)) {
      return;
    }

    const unsubscribe = multiplayerClient.subscribeToSessionComplete(sessionId, (event) => {
      this.handleSessionComplete(event);
    });

    this.unsubscribers.set(sessionId, unsubscribe);
    console.log(`[CompletionListener] Subscribed to completion for session ${sessionId}`);
  }

  unsubscribeFromSession(sessionId: string): void {
    const unsubscribe = this.unsubscribers.get(sessionId);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribers.delete(sessionId);
      console.log(`[CompletionListener] Unsubscribed from completion for session ${sessionId}`);
    }
  }

  private async handleSessionComplete(event: SessionCompleteEvent): Promise<void> {
    const { sessionId } = event;

    if (this.processingSet.has(sessionId)) {
      console.log(`[CompletionListener] Already processing session ${sessionId}, skipping`);
      return;
    }

    this.processingSet.add(sessionId);

    try {
      console.log(`[CompletionListener] Processing completion for session ${sessionId}`);

      const result = await apiClient.generateSessionSummary(sessionId);

      if (result.alreadySent) {
        console.log(`[CompletionListener] Summary already sent for session ${sessionId}`);
        return;
      }

      if (!result.platformOrigin || !result.platformChatId) {
        console.log(
          `[CompletionListener] No platform info for session ${sessionId}, skipping notification`,
        );
        return;
      }

      const adapter = getAdapter(result.platformOrigin as PlatformType);
      if (!adapter) {
        console.warn(`[CompletionListener] No adapter for platform ${result.platformOrigin}`);
        return;
      }

      const threadId = responseSubscriber.getThreadId(sessionId);

      await adapter.sendMessage({
        platform: result.platformOrigin as PlatformType,
        chatId: result.platformChatId,
        content: result.summary,
        threadId,
      });

      console.log(
        `[CompletionListener] Sent summary to ${result.platformOrigin}:${result.platformChatId}`,
      );
    } catch (error) {
      console.error(`[CompletionListener] Error processing completion for ${sessionId}:`, error);
    } finally {
      this.processingSet.delete(sessionId);
    }
  }
}

export const completionListener = new CompletionListener();
