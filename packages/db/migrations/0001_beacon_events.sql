CREATE TABLE "beacon_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"event_timestamp" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"org_id" text,
	"agent_id" text,
	"run_id" text,
	"session_id" text,
	"repo_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "beacon_events_created_idx" ON "beacon_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "beacon_events_event_id_uq" ON "beacon_events" USING btree ("event_id");