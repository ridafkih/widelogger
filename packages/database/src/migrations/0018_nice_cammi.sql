ALTER TABLE "orchestration_requests" ADD COLUMN "platform_origin" text;--> statement-breakpoint
ALTER TABLE "orchestration_requests" ADD COLUMN "platform_chat_id" text;--> statement-breakpoint
ALTER TABLE "orchestration_requests" ADD COLUMN "messaging_mode" text DEFAULT 'passive';--> statement-breakpoint
ALTER TABLE "orchestration_requests" ADD COLUMN "summary_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "orchestration_requests" ADD COLUMN "summary_text" text;--> statement-breakpoint
ALTER TABLE "orchestration_requests" ADD COLUMN "completed_at" timestamp with time zone;