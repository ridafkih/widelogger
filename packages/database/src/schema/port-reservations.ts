import {
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sessions } from "./sessions";

export const portReservations = pgTable(
  "port_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    port: integer("port").notNull(),
    type: varchar("type", { length: 20 }).notNull(),
    reservedAt: timestamp("reserved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.port, table.type)]
);

export type PortReservation = typeof portReservations.$inferSelect;
export type NewPortReservation = typeof portReservations.$inferInsert;
