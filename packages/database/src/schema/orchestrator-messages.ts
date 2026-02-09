import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const orchestratorMessages = pgTable(
  "orchestrator_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    platform: text("platform").notNull(),
    platformChatId: text("platform_chat_id").notNull(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    sessionId: uuid("session_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("orchestrator_messages_chat_idx").on(
      table.platform,
      table.platformChatId
    ),
    index("orchestrator_messages_created_idx").on(table.createdAt),
  ]
);

export type OrchestratorMessage = typeof orchestratorMessages.$inferSelect;
export type NewOrchestratorMessage = typeof orchestratorMessages.$inferInsert;
export type OrchestratorMessageRole = "user" | "assistant";
