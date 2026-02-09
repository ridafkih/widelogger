import { config } from "../config/environment";
import { widelog } from "../logging";
import type {
  ChatRequest,
  ChatResult,
  OrchestrationRequest,
  OrchestrationResult,
} from "../types/messages";

class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = config.apiUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async orchestrate(
    request: OrchestrationRequest
  ): Promise<OrchestrationResult> {
    const response = await fetch(`${this.baseUrl}/orchestrate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Orchestration failed: ${error.error || response.statusText}`
      );
    }

    return response.json();
  }

  async getSession(
    sessionId: string
  ): Promise<{ id: string; status: string } | null> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    return response.json();
  }

  async isSessionActive(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session !== null && session.status === "running";
  }

  async generateSessionSummary(sessionId: string): Promise<SummaryResult> {
    const response = await fetch(
      `${this.baseUrl}/internal/sessions/${sessionId}/summary`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Summary generation failed: ${error.error || response.statusText}`
      );
    }

    return response.json();
  }

  async chat(request: ChatRequest): Promise<ChatResult> {
    const response = await fetch(`${this.baseUrl}/orchestrate/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Chat orchestration failed: ${error || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Chat with streaming support. Calls onChunk for each text chunk as it arrives.
   * Returns the final ChatResult when the stream completes.
   * Falls back to regular JSON response if server doesn't return SSE.
   */
  async chatStream(
    request: ChatRequest,
    onChunk: (text: string) => Promise<void>
  ): Promise<ChatResult> {
    const response = await fetch(`${this.baseUrl}/orchestrate/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Chat orchestration failed: ${error || response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type") || "";

    // If SSE response, consume the stream
    if (contentType.includes("text/event-stream")) {
      return this.consumeSseStream(response, onChunk);
    }

    // Fallback to JSON response (non-streaming platforms)
    return response.json();
  }

  private async consumeSseStream(
    response: Response,
    onChunk: (text: string) => Promise<void>
  ): Promise<ChatResult> {
    return widelog.context(async () => {
      widelog.set("event_name", "api_client.consume_sse_stream");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: ChatResult | null = null;
      let currentEvent: string | null = null;
      let parseErrors = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines from the buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (currentEvent === "chunk" && parsed.text) {
                await onChunk(parsed.text);
              } else if (currentEvent === "done") {
                finalResult = parsed;
              } else if (currentEvent === "error") {
                throw new Error(parsed.error || "SSE stream error");
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) {
                parseErrors++;
                widelog.set("sse_parse_errors", parseErrors);
              } else {
                throw parseError;
              }
            }
            currentEvent = null;
          }
        }
      }

      if (!finalResult) {
        widelog.set("outcome", "error");
        widelog.set("error_message", "SSE stream ended without final result");
        widelog.flush();
        throw new Error("SSE stream ended without final result");
      }

      widelog.set("outcome", "success");
      widelog.flush();
      return finalResult;
    });
  }

  async notifySessionComplete(request: {
    sessionId: string;
    platformOrigin: string;
    platformChatId: string;
  }): Promise<ChatResult> {
    const response = await fetch(`${this.baseUrl}/orchestrate/chat/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Session complete notification failed: ${error.error || response.statusText}`
      );
    }

    return response.json();
  }

  async getSessionScreenshot(
    sessionId: string
  ): Promise<ScreenshotResult | null> {
    const response = await fetch(
      `${this.baseUrl}/internal/sessions/${sessionId}/screenshot`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return response.json();
  }
}

interface ScreenshotResult {
  sessionId: string;
  timestamp: number;
  format: string;
  encoding: string;
  data: string;
}

interface SummaryResult {
  success: boolean;
  outcome?: string;
  summary: string;
  orchestrationId?: string;
  platformOrigin?: string;
  platformChatId?: string;
  alreadySent?: boolean;
}

export const apiClient = new ApiClient();
