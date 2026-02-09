import type { RedisClient } from "bun";

export const INFERENCE_STATUS = {
  IDLE: "idle",
  GENERATING: "generating",
} as const;

export type InferenceStatus =
  (typeof INFERENCE_STATUS)[keyof typeof INFERENCE_STATUS];

interface SessionState {
  inferenceStatus: InferenceStatus;
  lastMessage?: string;
}

const KEY_PREFIX = "session:state";

export class SessionStateStore {
  constructor(private readonly redis: RedisClient) {}

  async getInferenceStatus(sessionId: string): Promise<InferenceStatus> {
    const value = await this.redis.get(
      `${KEY_PREFIX}:${sessionId}:inferenceStatus`
    );
    if (value === INFERENCE_STATUS.GENERATING) {
      return INFERENCE_STATUS.GENERATING;
    }
    return INFERENCE_STATUS.IDLE;
  }

  async setInferenceStatus(
    sessionId: string,
    status: InferenceStatus
  ): Promise<void> {
    await this.redis.set(`${KEY_PREFIX}:${sessionId}:inferenceStatus`, status);
  }

  async getLastMessage(sessionId: string): Promise<string | undefined> {
    const value = await this.redis.get(
      `${KEY_PREFIX}:${sessionId}:lastMessage`
    );
    return value ?? undefined;
  }

  async setLastMessage(sessionId: string, message: string): Promise<void> {
    if (!message) {
      return;
    }
    await this.redis.set(`${KEY_PREFIX}:${sessionId}:lastMessage`, message);
  }

  async getState(sessionId: string): Promise<SessionState> {
    const [inferenceStatus, lastMessage] = await Promise.all([
      this.getInferenceStatus(sessionId),
      this.getLastMessage(sessionId),
    ]);
    return { inferenceStatus, lastMessage };
  }

  async clear(sessionId: string): Promise<void> {
    await Promise.all([
      this.redis.del(`${KEY_PREFIX}:${sessionId}:inferenceStatus`),
      this.redis.del(`${KEY_PREFIX}:${sessionId}:lastMessage`),
    ]);
  }
}
