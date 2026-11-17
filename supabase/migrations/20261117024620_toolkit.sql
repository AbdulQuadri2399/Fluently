CREATE TABLE "principle_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"from_id" uuid NOT NULL,
	"to_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "principle_relations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "principles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"principle_key" text NOT NULL,
	"name" text NOT NULL,
	"general_goal" text NOT NULL,
	"sub_goal" text NOT NULL,
	"mechanism" text NOT NULL,
	"sense" text,
	"quick_insight" text,
	"extended_explanation" text,
	"examples" text,
	"link_to_paper" text,
	"reference" text,
	"design_lever" text,
	"outcome" text,
	"evidence" text,
	"related_raw" text,
	"evidence_level" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "principles_evidence_level_valid" CHECK ("principles"."evidence_level" in ('strong','some','none'))
);
--> statement-breakpoint
ALTER TABLE "principles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "toolkit_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"mechanism" text,
	"source_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "toolkit_candidates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "toolkit_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"file_name" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"principle_count" integer NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "toolkit_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "principle_relations" ADD CONSTRAINT "principle_relations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principle_relations" ADD CONSTRAINT "principle_relations_version_id_toolkit_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."toolkit_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principle_relations" ADD CONSTRAINT "principle_relations_from_id_principles_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."principles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principle_relations" ADD CONSTRAINT "principle_relations_to_id_principles_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."principles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principles" ADD CONSTRAINT "principles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principles" ADD CONSTRAINT "principles_version_id_toolkit_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."toolkit_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "toolkit_candidates" ADD CONSTRAINT "toolkit_candidates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "toolkit_candidates" ADD CONSTRAINT "toolkit_candidates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "toolkit_versions" ADD CONSTRAINT "toolkit_versions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "toolkit_versions" ADD CONSTRAINT "toolkit_versions_uploaded_by_members_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "principle_relations_unique" ON "principle_relations" USING btree ("from_id","to_id");--> statement-breakpoint
CREATE INDEX "principle_relations_version_idx" ON "principle_relations" USING btree ("version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "principles_version_key_unique" ON "principles" USING btree ("version_id","principle_key");--> statement-breakpoint
CREATE INDEX "principles_version_goal_idx" ON "principles" USING btree ("version_id","general_goal","sub_goal");--> statement-breakpoint
CREATE INDEX "toolkit_candidates_workspace_idx" ON "toolkit_candidates" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "toolkit_versions_number_unique" ON "toolkit_versions" USING btree ("workspace_id","number");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_toolkit_version_id_toolkit_versions_id_fk" FOREIGN KEY ("toolkit_version_id") REFERENCES "public"."toolkit_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_default_toolkit_version_id_toolkit_versions_id_fk" FOREIGN KEY ("default_toolkit_version_id") REFERENCES "public"."toolkit_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "principle_relations_select" ON "principle_relations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "principle_relations_insert" ON "principle_relations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_admin(workspace_id));--> statement-breakpoint
CREATE POLICY "principles_select" ON "principles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "principles_insert" ON "principles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_admin(workspace_id));--> statement-breakpoint
CREATE POLICY "toolkit_candidates_select" ON "toolkit_candidates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "toolkit_candidates_insert" ON "toolkit_candidates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "toolkit_candidates_update" ON "toolkit_candidates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_member(workspace_id)) WITH CHECK (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "toolkit_candidates_delete" ON "toolkit_candidates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "toolkit_versions_select" ON "toolkit_versions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "toolkit_versions_insert" ON "toolkit_versions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_admin("toolkit_versions"."workspace_id") and "toolkit_versions"."uploaded_by" = (select auth.uid()));