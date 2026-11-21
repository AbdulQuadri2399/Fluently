CREATE TABLE "email_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"email_id" uuid NOT NULL,
	"depth" text DEFAULT 'quick' NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"shortlist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dropped" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"used_image" boolean DEFAULT false NOT NULL,
	"used_measured" boolean DEFAULT false NOT NULL,
	"error_code" text,
	"started_by" uuid,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_audits_depth_valid" CHECK ("email_audits"."depth" in ('quick','full')),
	CONSTRAINT "email_audits_status_valid" CHECK ("email_audits"."status" in ('running','done','failed'))
);
--> statement-breakpoint
ALTER TABLE "email_audits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"email_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"part" text NOT NULL,
	"lens" text NOT NULL,
	"verdict" text NOT NULL,
	"principle_key" text,
	"principle_name" text,
	"extra" boolean DEFAULT false NOT NULL,
	"outside_toolkit" boolean DEFAULT false NOT NULL,
	"strength" text,
	"proof_kind" text NOT NULL,
	"proof_text" text NOT NULL,
	"explanation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_findings_part_valid" CHECK ("email_findings"."part" in ('subject','preheader','hero','body','ctas','footer')),
	CONSTRAINT "email_findings_lens_valid" CHECK ("email_findings"."lens" in ('structure','content','visual')),
	CONSTRAINT "email_findings_verdict_valid" CHECK ("email_findings"."verdict" in ('friction','working')),
	CONSTRAINT "email_findings_strength_valid" CHECK ("email_findings"."strength" is null or "email_findings"."strength" in ('High','Med','Low')),
	CONSTRAINT "email_findings_proof_valid" CHECK ("email_findings"."proof_kind" in ('quote','image','measured'))
);
--> statement-breakpoint
ALTER TABLE "email_findings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_audits" ADD CONSTRAINT "email_audits_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_audits" ADD CONSTRAINT "email_audits_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_audits" ADD CONSTRAINT "email_audits_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_audits" ADD CONSTRAINT "email_audits_started_by_members_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_findings" ADD CONSTRAINT "email_findings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_findings" ADD CONSTRAINT "email_findings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_findings" ADD CONSTRAINT "email_findings_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_findings" ADD CONSTRAINT "email_findings_audit_id_email_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."email_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_audits_email_depth_unique" ON "email_audits" USING btree ("email_id","depth");--> statement-breakpoint
CREATE INDEX "email_audits_project_idx" ON "email_audits" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "email_findings_email_idx" ON "email_findings" USING btree ("email_id","position");--> statement-breakpoint
CREATE INDEX "email_findings_project_idx" ON "email_findings" USING btree ("project_id");--> statement-breakpoint
CREATE POLICY "email_audits_select" ON "email_audits" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "email_findings_select" ON "email_findings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));