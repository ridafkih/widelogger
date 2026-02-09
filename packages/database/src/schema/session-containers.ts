import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { containers } from "./containers";
import { sessions } from "./sessions";

export const sessionContainers = pgTable("session_containers", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  containerId: uuid("container_id")
    .notNull()
    .references(() => containers.id, { onDelete: "cascade" }),
  runtimeId: text("runtime_id").notNull(),
  status: text("status").notNull().default("starting"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SessionContainer = typeof sessionContainers.$inferSelect;
export type NewSessionContainer = typeof sessionContainers.$inferInsert;
