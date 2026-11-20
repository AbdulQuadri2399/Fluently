CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"node_id" uuid,
	"upload_id" uuid,
	"source" text NOT NULL,
	"subject" text NOT NULL,
	"preheader" text,
	"html" text NOT NULL,
	"parts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"images_loaded" boolean DEFAULT false NOT NULL,
	"added_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emails_source_valid" CHECK ("emails"."source" in ('paste','html','eml')),
	CONSTRAINT "emails_subject_length" CHECK (char_length("emails"."subject") between 1 and 300),
	CONSTRAINT "emails_html_size" CHECK (char_length("emails"."html") <= 1000000)
);
--> statement-breakpoint
ALTER TABLE "emails" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "nodes" DROP CONSTRAINT "nodes_type_valid";--> statement-breakpoint
ALTER TABLE "intakes" ADD COLUMN "competitors" text;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_added_by_members_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emails_project_idx" ON "emails" USING btree ("project_id","created_at");--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_type_valid" CHECK ("nodes"."type" in ('objective','asset_set','ethics','source','finding','theme','opportunity','gap','recommendation','lofi_variant','annotation','test_plan','override','reference','email'));--> statement-breakpoint
CREATE POLICY "emails_select" ON "emails" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "emails_insert" ON "emails" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_member("emails"."workspace_id") and "emails"."added_by" = (select auth.uid()));