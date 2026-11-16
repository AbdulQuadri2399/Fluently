// Fluently database schema (04 §4). Every table has RLS enabled with explicit policies.
// Helper functions (is_member, is_admin, is_email_allowed) live in the first custom migration.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
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
