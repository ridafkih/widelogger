import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sessions } from "./sessions";

export const platformChatMappings = pgTable(
  "platform_chat_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    platform: text("platform").notNull(),
    platformChatId: text("platform_chat_id").notNull(),
    platformUserId: text("platform_user_id"),
    threadId: text("thread_id"),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("platform_chat_unique").on(table.platform, table.platformChatId),
    index("platform_chat_lookup_idx").on(table.platform, table.platformChatId),
    index("platform_session_idx").on(table.sessionId),
  ]
);

export type PlatformChatMapping = typeof platformChatMappings.$inferSelect;
export type NewPlatformChatMapping = typeof platformChatMappings.$inferInsert;
