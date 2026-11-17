CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"stage_run_id" uuid,
	"handle" text NOT NULL,
	"source_type" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"upload_id" uuid,
	"authors" text[],
	"year" integer,
	"doi" text,
	"external_id" text,
	"excerpt" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"added_by" uuid,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_type_valid" CHECK ("sources"."source_type" in ('toolkit','paper','desk','competitor','social','upload'))
);
--> statement-breakpoint
ALTER TABLE "sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_stage_run_id_stage_runs_id_fk" FOREIGN KEY ("stage_run_id") REFERENCES "public"."stage_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_added_by_members_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sources_run_handle_unique" ON "sources" USING btree ("stage_run_id","handle");--> statement-breakpoint
CREATE INDEX "sources_project_idx" ON "sources" USING btree ("project_id","source_type");--> statement-breakpoint
CREATE POLICY "sources_select" ON "sources" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "sources_insert" ON "sources" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_member("sources"."workspace_id") and "sources"."added_by" = (select auth.uid()));create trigger sources_updated_at before update on public.sources for each row execute function public.set_updated_at();
