import { EventEmitter } from "node:events";
import type {
  AgentSessionConfig,
  AgentEvents,
  AgentMessage,
  ToolInvocation,
  SessionContainer,
} from "./types";

interface OpenCodeMessage {
  role: "user" | "assistant";
  content: string;
}

interface OpenCodeStreamEvent {
  type: "token" | "tool_call" | "tool_result" | "message" | "done" | "error";
  content?: string;
  tool_call?: { id: string; name: string; arguments: Record<string, unknown> };
  tool_result?: { id: string; result: string };
  message?: OpenCodeMessage;
  error?: string;
}

export class AgentSession extends EventEmitter {
  private config: AgentSessionConfig;
  private opencodeUrl: string;
  private conversationId?: string;
  private messages: AgentMessage[] = [];
  private containers: Map<string, SessionContainer>;
  private isProcessing = false;

  constructor(config: AgentSessionConfig, opencodeUrl: string) {
    super();
    this.config = config;
    this.opencodeUrl = opencodeUrl;

    this.containers = new Map();
    for (const container of config.containers) {
      this.containers.set(container.id, container);
    }
  }

  override on<K extends keyof AgentEvents>(event: K, listener: AgentEvents[K]): this {
    return super.on(event, listener);
  }

  override emit<K extends keyof AgentEvents>(
    event: K,
    ...args: Parameters<AgentEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  get sessionId(): string {
    return this.config.sessionId;
  }

  get isActive(): boolean {
    return this.isProcessing;
  }

  getContainers(): SessionContainer[] {
    return Array.from(this.containers.values());
  }

  async sendMessage(content: string): Promise<void> {
    if (this.isProcessing) {
      throw new Error("Agent is already processing a message");
    }

    this.isProcessing = true;

    const userMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: Date.now(),
    };
    this.messages.push(userMessage);
    this.emit("message", userMessage);

    try {
      await this.processWithOpenCode(content);
    } catch (error) {
      this.emit("error", error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isProcessing = false;
      this.emit("complete");
    }
  }

  private async processWithOpenCode(userMessage: string): Promise<void> {
    const requestBody = {
      conversation_id: this.conversationId,
      message: userMessage,
      system_prompt: this.config.systemPrompt,
      stream: true,
    };

    const response = await fetch(`${this.opencodeUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`OpenCode API error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("No response body from OpenCode");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        let event: OpenCodeStreamEvent;
        try {
          event = JSON.parse(data);
        } catch {
          continue;
        }

        switch (event.type) {
          case "token":
            if (event.content) {
              assistantContent += event.content;
              this.emit("token", event.content);
            }
            break;

          case "tool_call":
            if (event.tool_call) {
              const toolInvocation: ToolInvocation = {
                id: event.tool_call.id,
                name: event.tool_call.name,
                status: "running",
                args: event.tool_call.arguments,
              };
              this.emit("toolStart", toolInvocation);
            }
            break;

          case "tool_result":
            if (event.tool_result) {
              const toolInvocation: ToolInvocation = {
                id: event.tool_result.id,
                name: "",
                status: "completed",
                result: event.tool_result.result,
              };
              this.emit("toolEnd", toolInvocation);
            }
            break;

          case "error":
            throw new Error(event.error ?? "Unknown OpenCode error");
        }
      }
    }

    if (assistantContent) {
      const assistantMessage: AgentMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent,
        timestamp: Date.now(),
      };
      this.messages.push(assistantMessage);
      this.emit("message", assistantMessage);
    }
  }

  getMessages(): AgentMessage[] {
    return [...this.messages];
  }

  stop(): void {
    this.isProcessing = false;
  }
}
