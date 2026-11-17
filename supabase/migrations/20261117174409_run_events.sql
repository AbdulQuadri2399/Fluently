CREATE TABLE "run_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"stage_run_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"step" text,
	"count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "run_events_kind_valid" CHECK ("run_events"."kind" in ('questions','started','found','kept','dropped','done','failed','paused_cost','resumed'))
);
--> statement-breakpoint
ALTER TABLE "run_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stage_runs" ADD COLUMN "questions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stage_runs" ADD COLUMN "over_cap_confirmed_by" uuid;--> statement-breakpoint
ALTER TABLE "stage_runs" ADD COLUMN "over_cap_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "run_events" ADD CONSTRAINT "run_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_events" ADD CONSTRAINT "run_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_events" ADD CONSTRAINT "run_events_stage_run_id_stage_runs_id_fk" FOREIGN KEY ("stage_run_id") REFERENCES "public"."stage_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "run_events_run_idx" ON "run_events" USING btree ("stage_run_id","created_at");--> statement-breakpoint
ALTER TABLE "stage_runs" ADD CONSTRAINT "stage_runs_over_cap_confirmed_by_members_id_fk" FOREIGN KEY ("over_cap_confirmed_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "run_events_select" ON "run_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));