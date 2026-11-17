CREATE TABLE "intakes" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"business_objective" text,
	"behavioural_objective" text,
	"audience_context" text,
	"constraints" text,
	"sector" text,
	"sector_other" text,
	"figma_link" text,
	"low_specificity" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intakes_business_len" CHECK (char_length("intakes"."business_objective") <= 500),
	CONSTRAINT "intakes_behavioural_len" CHECK (char_length("intakes"."behavioural_objective") <= 500),
	CONSTRAINT "intakes_audience_len" CHECK (char_length("intakes"."audience_context") <= 1500),
	CONSTRAINT "intakes_constraints_len" CHECK (char_length("intakes"."constraints") <= 1500)
);
--> statement-breakpoint
ALTER TABLE "intakes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_ratings_range" CHECK ("project_ratings"."rating" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "project_ratings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"mode" text NOT NULL,
	"channel" text NOT NULL,
	"client_label" text,
	"toolkit_version_id" uuid,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"current_stage" text DEFAULT 'intake' NOT NULL,
	"variants_per_rec" integer DEFAULT 2 NOT NULL,
	"cost_cap_override_gbp" numeric(8, 2),
	"archived_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_name_length" CHECK (char_length("projects"."name") between 1 and 80),
	CONSTRAINT "projects_mode_valid" CHECK ("projects"."mode" in ('new','optimise')),
	CONSTRAINT "projects_channel_valid" CHECK ("projects"."channel" in ('screens','email')),
	CONSTRAINT "projects_status_valid" CHECK ("projects"."status" in ('in_progress','waiting','running','failed','complete','blocked')),
	CONSTRAINT "projects_stage_valid" CHECK ("projects"."current_stage" in ('intake','ethics','research','solutions','lofi','testplan','complete')),
	CONSTRAINT "projects_variants_range" CHECK ("projects"."variants_per_rec" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "intakes" ADD CONSTRAINT "intakes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intakes" ADD CONSTRAINT "intakes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intakes" ADD CONSTRAINT "intakes_approved_by_members_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ratings" ADD CONSTRAINT "project_ratings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ratings" ADD CONSTRAINT "project_ratings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ratings" ADD CONSTRAINT "project_ratings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_updated_by_members_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intakes_workspace_idx" ON "intakes" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ratings_one_per_member" ON "project_ratings" USING btree ("project_id","member_id");--> statement-breakpoint
CREATE INDEX "project_ratings_member_idx" ON "project_ratings" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "projects_list_idx" ON "projects" USING btree ("workspace_id","archived_at","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "projects_created_by_idx" ON "projects" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "projects_updated_by_idx" ON "projects" USING btree ("updated_by");--> statement-breakpoint
CREATE POLICY "intakes_select" ON "intakes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "intakes_insert" ON "intakes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "intakes_update" ON "intakes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_member(workspace_id)) WITH CHECK (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "project_ratings_select" ON "project_ratings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "project_ratings_insert" ON "project_ratings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_member("project_ratings"."workspace_id") and "project_ratings"."member_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "projects_select" ON "projects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "projects_insert" ON "projects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_member("projects"."workspace_id") and "projects"."created_by" = (select auth.uid()) and "projects"."updated_by" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "projects_update" ON "projects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_member(workspace_id)) WITH CHECK (public.is_member("projects"."workspace_id") and "projects"."updated_by" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "projects_delete" ON "projects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.is_admin(workspace_id));