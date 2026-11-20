CREATE TABLE "email_renders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"email_id" uuid NOT NULL,
	"images" boolean DEFAULT false NOT NULL,
	"storage_path" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"measured" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rendered_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_renders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_renders" ADD CONSTRAINT "email_renders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_renders" ADD CONSTRAINT "email_renders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_renders" ADD CONSTRAINT "email_renders_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_renders" ADD CONSTRAINT "email_renders_rendered_by_members_id_fk" FOREIGN KEY ("rendered_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_renders_email_images_unique" ON "email_renders" USING btree ("email_id","images");--> statement-breakpoint
CREATE INDEX "email_renders_project_idx" ON "email_renders" USING btree ("project_id");--> statement-breakpoint
CREATE POLICY "email_renders_select" ON "email_renders" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));