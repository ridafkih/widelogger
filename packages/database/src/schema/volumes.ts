import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sessions } from "./sessions";

export const volumes = pgTable("volumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

export type Volume = typeof volumes.$inferSelect;
export type NewVolume = typeof volumes.$inferInsert;
