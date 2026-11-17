// Fluently database schema (04 §4). Every table has RLS enabled with explicit policies.
// Helper functions (is_member, is_admin, is_email_allowed) live in the first custom migration.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";
import { DEFAULT_MODEL_PRICES, DEFAULT_STAGE_MODELS } from "../ai/models";

const id = () => uuid("id").primaryKey().defaultRandom();
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const isMember = (col: string) => sql.raw(`public.is_member(${col})`);
const isAdmin = (col: string) => sql.raw(`public.is_admin(${col})`);

export const workspaces = pgTable(
  "workspaces",
  {
    id: id(),
    name: text("name").notNull(),
    costCapGbp: numeric("cost_cap_gbp", { precision: 8, scale: 2 }).notNull().default("10"),
    gbpPerUsd: numeric("gbp_per_usd", { precision: 8, scale: 4 }).notNull().default("0.79"),
    agencyServices: text("agency_services")
      .array()
      .notNull()
      .default(sql`'{"Implicit response test (IRT)","Behavioural interviews"}'::text[]`),
    sectorFlagList: text("sector_flag_list")
      .array()
      .notNull()
      .default(sql`'{"gambling","high-interest credit","alcohol","addictive products"}'::text[]`),
    sectorRefuseList: text("sector_refuse_list")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    defaultToolkitVersionId: uuid("default_toolkit_version_id"),
    stageModels: jsonb("stage_models")
      .notNull()
      .default(sql.raw(`'${JSON.stringify(DEFAULT_STAGE_MODELS)}'::jsonb`)),
    modelPrices: jsonb("model_prices")
      .notNull()
      .default(sql.raw(`'${JSON.stringify(DEFAULT_MODEL_PRICES)}'::jsonb`)),
    ...timestamps(),
  },
  (t) => [
    check("workspaces_cost_cap_range", sql`${t.costCapGbp} between 1 and 500`),
    pgPolicy("workspaces_select", { for: "select", to: authenticatedRole, using: isMember("id") }),
    pgPolicy("workspaces_update", {
      for: "update",
      to: authenticatedRole,
      using: isAdmin("id"),
      withCheck: isAdmin("id"),
    }),
  ],
).enableRLS();

export const members = pgTable(
  "members",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    displayName: text("display_name"),
    role: text("role").notNull().default("member"),
    active: boolean("active").notNull().default(true),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    check("members_role_valid", sql`${t.role} in ('admin','member')`),
    uniqueIndex("members_email_unique").on(sql`lower(${t.email})`),
    index("members_workspace_idx").on(t.workspaceId),
    pgPolicy("members_select", {
      for: "select",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
    // Column-level grants (custom migration) limit what self-updates can change.
    pgPolicy("members_update_self", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.id} = ${authUid}`,
      withCheck: sql`${t.id} = ${authUid}`,
    }),
  ],
).enableRLS();

export const allowlistEntries = pgTable(
  "allowlist_entries",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    value: text("value").notNull(),
    kind: text("kind").notNull(),
    createdBy: uuid("created_by").references(() => members.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [
    check("allowlist_kind_valid", sql`${t.kind} in ('email','domain')`),
    uniqueIndex("allowlist_value_unique").on(t.workspaceId, sql`lower(${t.value})`),
    index("allowlist_workspace_idx").on(t.workspaceId),
    pgPolicy("allowlist_select", {
      for: "select",
      to: authenticatedRole,
      using: isAdmin("workspace_id"),
    }),
    pgPolicy("allowlist_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isAdmin("workspace_id"),
    }),
    pgPolicy("allowlist_delete", {
      for: "delete",
      to: authenticatedRole,
      using: isAdmin("workspace_id"),
    }),
  ],
).enableRLS();

export const events = pgTable(
  "events",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    props: jsonb("props").notNull().default({}),
    ...timestamps(),
  },
  (t) => [
    index("events_workspace_name_idx").on(t.workspaceId, t.name, t.createdAt),
    index("events_member_idx").on(t.memberId),
    pgPolicy("events_select", {
      for: "select",
      to: authenticatedRole,
      using: isAdmin("workspace_id"),
    }),
    pgPolicy("events_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`public.is_member(${t.workspaceId}) and ${t.memberId} = ${authUid}`,
    }),
  ],
).enableRLS();

// ---------- Slice 1: projects (04 section 4) ----------

export const projects = pgTable(
  "projects",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    mode: text("mode").notNull(),
    channel: text("channel").notNull(),
    clientLabel: text("client_label"),
    toolkitVersionId: uuid("toolkit_version_id"),
    status: text("status").notNull().default("in_progress"),
    currentStage: text("current_stage").notNull().default("intake"),
    variantsPerRec: integer("variants_per_rec").notNull().default(2),
    costCapOverrideGbp: numeric("cost_cap_override_gbp", { precision: 8, scale: 2 }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    ...timestamps(),
  },
  (t) => [
    check("projects_name_length", sql`char_length(${t.name}) between 1 and 80`),
    check("projects_mode_valid", sql`${t.mode} in ('new','optimise')`),
    check("projects_channel_valid", sql`${t.channel} in ('screens','email')`),
    check(
      "projects_status_valid",
      sql`${t.status} in ('in_progress','waiting','running','failed','complete','blocked')`,
    ),
    check(
      "projects_stage_valid",
      sql`${t.currentStage} in ('intake','ethics','research','solutions','lofi','testplan','complete')`,
    ),
    check("projects_variants_range", sql`${t.variantsPerRec} between 1 and 3`),
    index("projects_list_idx").on(t.workspaceId, t.archivedAt, t.updatedAt.desc()),
    index("projects_created_by_idx").on(t.createdBy),
    index("projects_updated_by_idx").on(t.updatedBy),
    pgPolicy("projects_select", {
      for: "select",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
    pgPolicy("projects_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`public.is_member(${t.workspaceId}) and ${t.createdBy} = ${authUid} and ${t.updatedBy} = ${authUid}`,
    }),
    pgPolicy("projects_update", {
      for: "update",
      to: authenticatedRole,
      using: isMember("workspace_id"),
      withCheck: sql`public.is_member(${t.workspaceId}) and ${t.updatedBy} = ${authUid}`,
    }),
    pgPolicy("projects_delete", {
      for: "delete",
      to: authenticatedRole,
      using: isAdmin("workspace_id"),
    }),
  ],
).enableRLS();

export const intakes = pgTable(
  "intakes",
  {
    projectId: uuid("project_id")
      .primaryKey()
      .references(() => projects.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    businessObjective: text("business_objective"),
    behaviouralObjective: text("behavioural_objective"),
    audienceContext: text("audience_context"),
    constraints: text("constraints"),
    sector: text("sector"),
    sectorOther: text("sector_other"),
    figmaLink: text("figma_link"),
    lowSpecificity: jsonb("low_specificity").notNull().default({}),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => members.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    check("intakes_business_len", sql`char_length(${t.businessObjective}) <= 500`),
    check("intakes_behavioural_len", sql`char_length(${t.behaviouralObjective}) <= 500`),
    check("intakes_audience_len", sql`char_length(${t.audienceContext}) <= 1500`),
    check("intakes_constraints_len", sql`char_length(${t.constraints}) <= 1500`),
    index("intakes_workspace_idx").on(t.workspaceId),
    pgPolicy("intakes_select", {
      for: "select",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
    pgPolicy("intakes_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isMember("workspace_id"),
    }),
    pgPolicy("intakes_update", {
      for: "update",
      to: authenticatedRole,
      using: isMember("workspace_id"),
      withCheck: isMember("workspace_id"),
    }),
  ],
).enableRLS();

export const projectRatings = pgTable(
  "project_ratings",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    ...timestamps(),
  },
  (t) => [
    check("project_ratings_range", sql`${t.rating} between 1 and 5`),
    uniqueIndex("project_ratings_one_per_member").on(t.projectId, t.memberId),
    index("project_ratings_member_idx").on(t.memberId),
    pgPolicy("project_ratings_select", {
      for: "select",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
    pgPolicy("project_ratings_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`public.is_member(${t.workspaceId}) and ${t.memberId} = ${authUid}`,
    }),
  ],
).enableRLS();

// ---------- Slice 2: AI usage log (04 section 4, AC27.1) ----------

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    stage: text("stage").notNull(),
    step: text("step").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    webSearches: integer("web_searches").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 5 }).notNull(),
    durationMs: integer("duration_ms").notNull(),
    success: boolean("success").notNull(),
    ...timestamps(),
  },
  (t) => [
    index("ai_usage_project_stage_idx").on(t.projectId, t.stage),
    index("ai_usage_workspace_idx").on(t.workspaceId, t.createdAt),
    // Members read their workspace's usage; only server jobs (service role) write it.
    pgPolicy("ai_usage_select", {
      for: "select",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
  ],
).enableRLS();
