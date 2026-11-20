// Fluently database schema (04 §4). Every table has RLS enabled with explicit policies.
// Helper functions (is_member, is_admin, is_email_allowed) live in the first custom migration.
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
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
    defaultToolkitVersionId: uuid("default_toolkit_version_id").references(
      (): AnyPgColumn => toolkitVersions.id,
      { onDelete: "set null" },
    ),
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
    toolkitVersionId: uuid("toolkit_version_id").references((): AnyPgColumn => toolkitVersions.id, {
      onDelete: "restrict",
    }),
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
    // AC32.6: optional, up to five names, one per line.
    competitors: text("competitors"),
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

// ---------- Slice 3: toolkit versions (04 section 4, AC4.5–AC4.8) ----------
// Saved versions are immutable: select for members, insert for admins, no update/delete policies.

export const toolkitVersions = pgTable(
  "toolkit_versions",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references((): AnyPgColumn => workspaces.id, { onDelete: "restrict" }),
    number: integer("number").notNull(),
    fileName: text("file_name").notNull(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    principleCount: integer("principle_count").notNull(),
    warnings: jsonb("warnings").notNull().default([]),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("toolkit_versions_number_unique").on(t.workspaceId, t.number),
    pgPolicy("toolkit_versions_select", {
      for: "select",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
    pgPolicy("toolkit_versions_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`public.is_admin(${t.workspaceId}) and ${t.uploadedBy} = ${authUid}`,
    }),
  ],
).enableRLS();

export const principles = pgTable(
  "principles",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => toolkitVersions.id, { onDelete: "cascade" }),
    principleKey: text("principle_key").notNull(),
    name: text("name").notNull(),
    generalGoal: text("general_goal").notNull(),
    subGoal: text("sub_goal").notNull(),
    mechanism: text("mechanism").notNull(),
    sense: text("sense"),
    quickInsight: text("quick_insight"),
    extendedExplanation: text("extended_explanation"),
    examples: text("examples"),
    linkToPaper: text("link_to_paper"),
    reference: text("reference"),
    designLever: text("design_lever"),
    outcome: text("outcome"),
    evidence: text("evidence"),
    relatedRaw: text("related_raw"),
    evidenceLevel: text("evidence_level").notNull(),
    ...timestamps(),
  },
  (t) => [
    check("principles_evidence_level_valid", sql`${t.evidenceLevel} in ('strong','some','none')`),
    uniqueIndex("principles_version_key_unique").on(t.versionId, t.principleKey),
    index("principles_version_goal_idx").on(t.versionId, t.generalGoal, t.subGoal),
    pgPolicy("principles_select", {
      for: "select",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
    pgPolicy("principles_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isAdmin("workspace_id"),
    }),
  ],
).enableRLS();

export const principleRelations = pgTable(
  "principle_relations",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => toolkitVersions.id, { onDelete: "cascade" }),
    fromId: uuid("from_id")
      .notNull()
      .references(() => principles.id, { onDelete: "cascade" }),
    toId: uuid("to_id")
      .notNull()
      .references(() => principles.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("principle_relations_unique").on(t.fromId, t.toId),
    index("principle_relations_version_idx").on(t.versionId),
    pgPolicy("principle_relations_select", {
      for: "select",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
    pgPolicy("principle_relations_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isAdmin("workspace_id"),
    }),
  ],
).enableRLS();

export const toolkitCandidates = pgTable(
  "toolkit_candidates",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mechanism: text("mechanism"),
    sourceId: uuid("source_id")
      .notNull()
      .references((): AnyPgColumn => sources.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (t) => [
    index("toolkit_candidates_workspace_idx").on(t.workspaceId),
    pgPolicy("toolkit_candidates_select", {
      for: "select",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
    pgPolicy("toolkit_candidates_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isMember("workspace_id"),
    }),
    pgPolicy("toolkit_candidates_update", {
      for: "update",
      to: authenticatedRole,
      using: isMember("workspace_id"),
      withCheck: isMember("workspace_id"),
    }),
    pgPolicy("toolkit_candidates_delete", {
      for: "delete",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
  ],
).enableRLS();

// ---------- Slice 4: brief uploads, tree cards and lines, runs, checkpoints (04 section 4) ----------

const memberRead = (name: string) =>
  pgPolicy(`${name}_select`, {
    for: "select",
    to: authenticatedRole,
    using: isMember("workspace_id"),
  });

export const uploads = pgTable(
  "uploads",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    storagePath: text("storage_path").notNull(),
    fileName: text("file_name").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    meta: jsonb("meta").notNull().default({}),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    ...timestamps(),
  },
  (t) => [
    check("uploads_kind_valid", sql`${t.kind} in ('asset','client_data')`),
    index("uploads_project_idx").on(t.projectId),
    memberRead("uploads"),
    pgPolicy("uploads_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`public.is_member(${t.workspaceId}) and ${t.uploadedBy} = ${authUid}`,
    }),
    pgPolicy("uploads_delete", {
      for: "delete",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
  ],
).enableRLS();

export const stageRuns = pgTable(
  "stage_runs",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    status: text("status").notNull().default("queued"),
    steps: jsonb("steps").notNull().default([]),
    feedback: text("feedback"),
    replaceHuman: boolean("replace_human").notNull().default(false),
    model: text("model"),
    inngestRunId: text("inngest_run_id"),
    retryOf: uuid("retry_of"),
    // AC11.9: research questions the AI wrote from the objectives.
    questions: jsonb("questions").notNull().default([]),
    // AC27.4: a member chose to continue this run past the project's AI budget.
    overCapConfirmedBy: uuid("over_cap_confirmed_by").references(() => members.id, {
      onDelete: "set null",
    }),
    overCapConfirmedAt: timestamp("over_cap_confirmed_at", { withTimezone: true }),
    errorCode: text("error_code"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    startedBy: uuid("started_by")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    ...timestamps(),
  },
  (t) => [
    check(
      "stage_runs_stage_valid",
      sql`${t.stage} in ('ethics','research','solutions','lofi','testplan')`,
    ),
    check(
      "stage_runs_status_valid",
      sql`${t.status} in ('queued','running','succeeded','partial','failed','cancelled','paused_cost')`,
    ),
    index("stage_runs_project_stage_idx").on(t.projectId, t.stage, t.createdAt),
    // Written only by jobs (service role) and checked database functions.
    memberRead("stage_runs"),
  ],
).enableRLS();

export const nodes = pgTable(
  "nodes",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    stage: text("stage").notNull(),
    title: text("title").notNull(),
    data: jsonb("data").notNull().default({}),
    provenance: text("provenance").notNull().default("ai"),
    status: text("status").notNull().default("ok"),
    stale: boolean("stale").notNull().default(false),
    confidence: text("confidence"),
    lowSpecificity: boolean("low_specificity").notNull().default(false),
    model: text("model"),
    stageRunId: uuid("stage_run_id").references(() => stageRuns.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: uuid("created_by").references(() => members.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => members.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    check(
      "nodes_type_valid",
      sql`${t.type} in ('objective','asset_set','ethics','source','finding','theme','opportunity','gap','recommendation','lofi_variant','annotation','test_plan','override','reference','email')`,
    ),
    check("nodes_provenance_valid", sql`${t.provenance} in ('ai','ai_edited','human')`),
    check(
      "nodes_status_valid",
      sql`${t.status} in ('ok','failed','flagged','overridden','running')`,
    ),
    index("nodes_project_type_idx")
      .on(t.projectId, t.type)
      .where(sql`${t.deletedAt} is null`),
    memberRead("nodes"),
    pgPolicy("nodes_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isMember("workspace_id"),
    }),
    pgPolicy("nodes_update", {
      for: "update",
      to: authenticatedRole,
      using: isMember("workspace_id"),
      withCheck: isMember("workspace_id"),
    }),
    pgPolicy("nodes_delete", {
      for: "delete",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
  ],
).enableRLS();

export const edges = pgTable(
  "edges",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    fromId: uuid("from_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    toId: uuid("to_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("built_from"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("edges_from_to_unique").on(t.fromId, t.toId),
    index("edges_from_idx").on(t.fromId),
    index("edges_to_idx").on(t.toId),
    memberRead("edges"),
    pgPolicy("edges_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isMember("workspace_id"),
    }),
    pgPolicy("edges_update", {
      for: "update",
      to: authenticatedRole,
      using: isMember("workspace_id"),
      withCheck: isMember("workspace_id"),
    }),
    pgPolicy("edges_delete", {
      for: "delete",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
  ],
).enableRLS();

export const nodeHistory = pgTable(
  "node_history",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    snapshot: jsonb("snapshot").notNull(),
    change: text("change").notNull(),
    changedBy: uuid("changed_by").references(() => members.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [
    check(
      "node_history_change_valid",
      sql`${t.change} in ('created','edited','regenerated','merged','deleted','restored')`,
    ),
    index("node_history_node_idx").on(t.nodeId),
    // Written by a trigger on nodes (security definer); read-only for members.
    memberRead("node_history"),
  ],
).enableRLS();

export const checkpoints = pgTable(
  "checkpoints",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    decision: text("decision").notNull(),
    feedback: text("feedback"),
    selection: uuid("selection").array(),
    decidedBy: uuid("decided_by")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps(),
  },
  (t) => [
    check("checkpoints_decision_valid", sql`${t.decision} in ('approve','send_back')`),
    index("checkpoints_project_idx").on(t.projectId, t.stage),
    memberRead("checkpoints"),
    pgPolicy("checkpoints_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`public.is_member(${t.workspaceId}) and ${t.decidedBy} = ${authUid}`,
    }),
  ],
).enableRLS();

export const ethicsOverrides = pgTable(
  "ethics_overrides",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    rule: text("rule").notNull(),
    reason: text("reason").notNull(),
    decidedBy: uuid("decided_by")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    ...timestamps(),
  },
  (t) => [
    check("ethics_overrides_reason_length", sql`char_length(${t.reason}) >= 20`),
    index("ethics_overrides_project_idx").on(t.projectId),
    memberRead("ethics_overrides"),
    pgPolicy("ethics_overrides_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`public.is_member(${t.workspaceId}) and ${t.decidedBy} = ${authUid}`,
    }),
  ],
).enableRLS();

// ---------- Slice 6: sources (04 section 4, AC12.2) ----------

export const sources = pgTable(
  "sources",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    stageRunId: uuid("stage_run_id").references(() => stageRuns.id, { onDelete: "set null" }),
    handle: text("handle").notNull(),
    sourceType: text("source_type").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    uploadId: uuid("upload_id").references(() => uploads.id, { onDelete: "set null" }),
    authors: text("authors").array(),
    year: integer("year"),
    doi: text("doi"),
    externalId: text("external_id"),
    excerpt: text("excerpt"),
    meta: jsonb("meta").notNull().default({}),
    addedBy: uuid("added_by").references(() => members.id, { onDelete: "set null" }),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps(),
  },
  (t) => [
    check(
      "sources_type_valid",
      sql`${t.sourceType} in ('toolkit','paper','desk','competitor','social','upload')`,
    ),
    uniqueIndex("sources_run_handle_unique").on(t.stageRunId, t.handle),
    index("sources_project_idx").on(t.projectId, t.sourceType),
    pgPolicy("sources_select", {
      for: "select",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
    // Jobs write with the service role; members add sources by hand (AC12.10) as themselves.
    pgPolicy("sources_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`public.is_member(${t.workspaceId}) and ${t.addedBy} = ${authUid}`,
    }),
  ],
).enableRLS();

// ---------- Slice 7: research activity log (AC11.10, 04 D32) ----------

export const runEvents = pgTable(
  "run_events",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    stageRunId: uuid("stage_run_id")
      .notNull()
      .references(() => stageRuns.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    step: text("step"),
    count: integer("count"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "run_events_kind_valid",
      sql`${t.kind} in ('questions','started','found','kept','dropped','done','failed','paused_cost','resumed')`,
    ),
    index("run_events_run_idx").on(t.stageRunId, t.createdAt),
    // Written only by jobs (service role); members read.
    memberRead("run_events"),
  ],
).enableRLS();

// ---------- Phase 1: emails (AC31.2, AC31.3, 04 D37) ----------

export const emails = pgTable(
  "emails",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    nodeId: uuid("node_id").references((): AnyPgColumn => nodes.id, { onDelete: "set null" }),
    uploadId: uuid("upload_id").references(() => uploads.id, { onDelete: "set null" }),
    source: text("source").notNull(),
    subject: text("subject").notNull(),
    preheader: text("preheader"),
    html: text("html").notNull(),
    parts: jsonb("parts").notNull().default({}),
    imagesLoaded: boolean("images_loaded").notNull().default(false),
    addedBy: uuid("added_by")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    ...timestamps(),
  },
  (t) => [
    check("emails_source_valid", sql`${t.source} in ('paste','html','eml')`),
    check("emails_subject_length", sql`char_length(${t.subject}) between 1 and 300`),
    check("emails_html_size", sql`char_length(${t.html}) <= 1000000`),
    index("emails_project_idx").on(t.projectId, t.createdAt),
    memberRead("emails"),
    // Members add emails as themselves and remove them (remove_email); editing waits for later.
    pgPolicy("emails_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`public.is_member(${t.workspaceId}) and ${t.addedBy} = ${authUid}`,
    }),
    pgPolicy("emails_delete", {
      for: "delete",
      to: authenticatedRole,
      using: isMember("workspace_id"),
    }),
  ],
).enableRLS();

// ---------- Phase 1: email renders (AC31.4, AC31.5, 04 D38) ----------

export const emailRenders = pgTable(
  "email_renders",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    emailId: uuid("email_id")
      .notNull()
      .references(() => emails.id, { onDelete: "cascade" }),
    // Whether the email's own images were let in for this picture.
    images: boolean("images").notNull().default(false),
    storagePath: text("storage_path").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    measured: jsonb("measured").notNull().default({}),
    renderedBy: uuid("rendered_by").references(() => members.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("email_renders_email_images_unique").on(t.emailId, t.images),
    index("email_renders_project_idx").on(t.projectId),
    // Written only by the render route (service role); members read.
    memberRead("email_renders"),
  ],
).enableRLS();
