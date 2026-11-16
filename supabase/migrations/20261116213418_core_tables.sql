CREATE TABLE "allowlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"value" text NOT NULL,
	"kind" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allowlist_kind_valid" CHECK ("allowlist_entries"."kind" in ('email','domain'))
);
--> statement-breakpoint
ALTER TABLE "allowlist_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"member_id" uuid,
	"name" text NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'member' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_role_valid" CHECK ("members"."role" in ('admin','member'))
);
--> statement-breakpoint
ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"cost_cap_gbp" numeric(8, 2) DEFAULT '10' NOT NULL,
	"gbp_per_usd" numeric(8, 4) DEFAULT '0.79' NOT NULL,
	"agency_services" text[] DEFAULT '{"Implicit response test (IRT)","Behavioural interviews"}'::text[] NOT NULL,
	"sector_flag_list" text[] DEFAULT '{"gambling","high-interest credit","alcohol","addictive products"}'::text[] NOT NULL,
	"sector_refuse_list" text[] DEFAULT '{}'::text[] NOT NULL,
	"default_toolkit_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_cost_cap_range" CHECK ("workspaces"."cost_cap_gbp" between 1 and 500)
);
--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "allowlist_entries" ADD CONSTRAINT "allowlist_entries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allowlist_entries" ADD CONSTRAINT "allowlist_entries_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "allowlist_value_unique" ON "allowlist_entries" USING btree ("workspace_id",lower("value"));--> statement-breakpoint
CREATE INDEX "allowlist_workspace_idx" ON "allowlist_entries" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "events_workspace_name_idx" ON "events" USING btree ("workspace_id","name","created_at");--> statement-breakpoint
CREATE INDEX "events_member_idx" ON "events" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_email_unique" ON "members" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "members_workspace_idx" ON "members" USING btree ("workspace_id");--> statement-breakpoint
CREATE POLICY "allowlist_select" ON "allowlist_entries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_admin(workspace_id));--> statement-breakpoint
CREATE POLICY "allowlist_insert" ON "allowlist_entries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_admin(workspace_id));--> statement-breakpoint
CREATE POLICY "allowlist_delete" ON "allowlist_entries" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.is_admin(workspace_id));--> statement-breakpoint
CREATE POLICY "events_select" ON "events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_admin(workspace_id));--> statement-breakpoint
CREATE POLICY "events_insert" ON "events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_member("events"."workspace_id") and "events"."member_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "members_select" ON "members" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));--> statement-breakpoint
CREATE POLICY "members_update_self" ON "members" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("members"."id" = (select auth.uid())) WITH CHECK ("members"."id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "workspaces_select" ON "workspaces" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(id));--> statement-breakpoint
CREATE POLICY "workspaces_update" ON "workspaces" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_admin(id)) WITH CHECK (public.is_admin(id));