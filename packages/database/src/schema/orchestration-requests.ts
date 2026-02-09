import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { sessions } from "./sessions";

export const orchestrationRequests = pgTable("orchestration_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  channelId: text("channel_id"),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"),
  resolvedProjectId: uuid("resolved_project_id").references(() => projects.id),
  resolvedSessionId: uuid("resolved_session_id").references(() => sessions.id),
  resolutionConfidence: text("resolution_confidence"),
  resolutionReasoning: text("resolution_reasoning"),
  errorMessage: text("error_message"),
  modelId: text("model_id"),
  platformOrigin: text("platform_origin"),
  platformChatId: text("platform_chat_id"),
  messagingMode: text("messaging_mode").default("passive"),
  summaryStatus: text("summary_status").default("pending"),
  summaryText: text("summary_text"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OrchestrationRequest = typeof orchestrationRequests.$inferSelect;
export type NewOrchestrationRequest = typeof orchestrationRequests.$inferInsert;
export type OrchestrationStatus =
  | "pending"
  | "thinking"
  | "delegating"
  | "starting"
  | "complete"
  | "error";
export type ResolutionConfidence = "high" | "medium" | "low";
export type MessagingMode = "active" | "passive";
export type SummaryStatus = "pending" | "generating" | "sent" | "failed";
