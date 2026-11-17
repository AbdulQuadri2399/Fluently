CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"stage" text NOT NULL,
	"step" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_write_tokens" integer DEFAULT 0 NOT NULL,
	"web_searches" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 5) NOT NULL,
	"duration_ms" integer NOT NULL,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "stage_models" jsonb DEFAULT '{"intake":{"model":"claude-haiku-5-5","effort":"medium"},"ethics":{"model":"claude-haiku-5-5","effort":"medium"},"research":{"model":"claude-haiku-5-5","effort":"medium"},"solutions":{"model":"claude-haiku-5-5","effort":"medium"},"lofi":{"model":"claude-haiku-5-5","effort":"medium"},"testplan":{"model":"claude-haiku-5-5","effort":"medium"}}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "model_prices" jsonb DEFAULT '{"claude-haiku-5-5":{"input":0.1,"output":0.5,"cacheRead":0.01,"cacheWrite":0.125,"webSearchPer1k":10},"claude-sonnet-5-5":{"input":2,"output":10,"cacheRead":0.1,"cacheWrite":2.5,"webSearchPer1k":10},"claude-opus-5-5":{"input":4,"output":20,"cacheRead":0.2,"cacheWrite":5,"webSearchPer1k":10}}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_project_stage_idx" ON "ai_usage" USING btree ("project_id","stage");--> statement-breakpoint
CREATE INDEX "ai_usage_workspace_idx" ON "ai_usage" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE POLICY "ai_usage_select" ON "ai_usage" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_member(workspace_id));