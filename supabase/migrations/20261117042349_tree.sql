CREATE TABLE "checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"decision" text NOT NULL,
	"feedback" text,
	"selection" uuid[],
	"decided_by" uuid NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkpoints_decision_valid" CHECK ("checkpoints"."decision" in ('approve','send_back'))
);
--> statement-breakpoint
ALTER TABLE "checkpoints" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"from_id" uuid NOT NULL,
	"to_id" uuid NOT NULL,
	"kind" text DEFAULT 'built_from' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "edges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ethics_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"node_id" uuid NOT NULL,
	"rule" text NOT NULL,
	"reason" text NOT NULL,
	"decided_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ethics_overrides_reason_length" CHECK (char_length("ethics_overrides"."reason") >= 20)
);
--> statement-breakpoint
ALTER TABLE "ethics_overrides" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "node_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"node_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"change" text NOT NULL,
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "node_history_change_valid" CHECK ("node_history"."change" in ('created','edited','regenerated','merged','deleted','restored'))
);
--> statement-breakpoint
ALTER TABLE "node_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"stage" text NOT NULL,
	"title" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provenance" text DEFAULT 'ai' NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"stale" boolean DEFAULT false NOT NULL,
	"confidence" text,
	"low_specificity" boolean DEFAULT false NOT NULL,
	"model" text,
	"stage_run_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nodes_type_valid" CHECK ("nodes"."type" in ('objective','asset_set','ethics','source','finding','theme','opportunity','gap','recommendation','lofi_variant','annotation','test_plan','override','reference')),
	CONSTRAINT "nodes_provenance_valid" CHECK ("nodes"."provenance" in ('ai','ai_edited','human')),
	CONSTRAINT "nodes_status_valid" CHECK ("nodes"."status" in ('ok','failed','flagged','overridden','running'))
);
--> statement-breakpoint
ALTER TABLE "nodes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stage_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"feedback" text,
	"replace_human" boolean DEFAULT false NOT NULL,
	"model" text,
	"inngest_run_id" text,
	"error_code" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"started_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stage_runs_stage_valid" CHECK ("stage_runs"."stage" in ('ethics','research','solutions','lofi','testplan')),
	CONSTRAINT "stage_runs_status_valid" CHECK ("stage_runs"."status" in ('queued','running','succeeded','partial','failed','cancelled','paused_cost'))
);
--> statement-breakpoint
ALTER TABLE "stage_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uploads_kind_valid" CHECK ("uploads"."kind" in ('asset','client_data'))
);
--> statement-breakpoint
ALTER TABLE "uploads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_decided_by_members_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_from_id_nodes_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_to_id_nodes_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ethics_overrides" ADD CONSTRAINT "ethics_overrides_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ethics_overrides" ADD CONSTRAINT "ethics_overrides_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ethics_overrides" ADD CONSTRAINT "ethics_overrides_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ethics_overrides" ADD CONSTRAINT "ethics_overrides_decided_by_members_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_history" ADD CONSTRAINT "node_history_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_history" ADD CONSTRAINT "node_history_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_history" ADD CONSTRAINT "node_history_changed_by_members_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_stage_run_id_stage_runs_id_fk" FOREIGN KEY ("stage_run_id") REFERENCES "public"."stage_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_updated_by_members_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_runs" ADD CONSTRAINT "stage_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_runs" ADD CONSTRAINT "stage_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_runs" ADD CONSTRAINT "stage_runs_started_by_members_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploaded_by_members_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkpoints_project_idx" ON "checkpoints" USING btree ("project_id","stage");--> statement-breakpoint
CREATE UNIQUE INDEX "edges_from_to_unique" ON "edges" USING btree ("from_id","to_id");--> statement-breakpoint
CREATE INDEX "edges_from_idx" ON "edges" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "edges_to_idx" ON "edges" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "ethics_overrides_project_idx" ON "ethics_overrides" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "node_history_node_idx" ON "node_history" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "nodes_project_type_idx" ON "nodes" USING btree ("project_id","type") WHERE "nodes"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "stage_runs_project_stage_idx" ON "stage_runs" USING btree ("project_id","stage","created_at");--> statement-breakpoint
CREATE INDEX "uploads_project_idx" ON "uploads" USING btree ("project_id");--> statement-breakpoint
CREATE POLICY "checkpoints_select" ON "checkpoints" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "checkpoints_insert" ON "checkpoints" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_member("checkpoints"."workspace_id") and "checkpoints"."decided_by" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "edges_select" ON "edges" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "edges_insert" ON "edges" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "edges_update" ON "edges" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_member(workspace_id)) WITH CHECK (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "edges_delete" ON "edges" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "ethics_overrides_select" ON "ethics_overrides" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "ethics_overrides_insert" ON "ethics_overrides" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_member("ethics_overrides"."workspace_id") and "ethics_overrides"."decided_by" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "node_history_select" ON "node_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "nodes_select" ON "nodes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "nodes_insert" ON "nodes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "nodes_update" ON "nodes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_member(workspace_id)) WITH CHECK (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "nodes_delete" ON "nodes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "stage_runs_select" ON "stage_runs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "uploads_select" ON "uploads" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "uploads_insert" ON "uploads" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_member("uploads"."workspace_id") and "uploads"."uploaded_by" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "uploads_delete" ON "uploads" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.is_member(workspace_id));