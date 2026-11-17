import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { logEvent } from "@/lib/events/log";
import type { Database } from "@/lib/supabase/database.types";
import {
  createProjectSchema,
  listProjectsSchema,
  type CreateProjectInput,
  type ListProjectsInput,
} from "@/lib/schemas/project";

type Client = SupabaseClient<Database>;
const PAGE = 25;

export type ProjectRow = {
  id: string;
  name: string;
  mode: string;
  channel: string;
  clientLabel: string | null;
  status: string;
  currentStage: string;
  updatedAt: string;
  updatedByName: string;
};

/** The signed-in person's active membership, or null. */
export async function currentMember(client: Client) {
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return null;
  const { data } = await client
    .from("members")
    .select("id, workspace_id, role, active, display_name, email, onboarded_at")
    .eq("id", auth.user.id)
    .maybeSingle();
  return data && data.active ? data : null;
}

/** O10 createProject (AC7.1, AC7.2). Pins the workspace's current default toolkit version. */
export async function createProject(
  client: Client,
  input: CreateProjectInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const ws = await client
    .from("workspaces")
    .select("default_toolkit_version_id")
    .eq("id", me.workspace_id)
    .single();
  const { data, error } = await client
    .from("projects")
    .insert({
      workspace_id: me.workspace_id,
      name: parsed.data.name,
      mode: parsed.data.mode,
      channel: parsed.data.channel,
      client_label: parsed.data.clientLabel || null,
      toolkit_version_id: ws.data?.default_toolkit_version_id ?? null,
      created_by: me.id,
      updated_by: me.id,
    })
    .select("id")
    .single();
  if (error || !data) return fail("unavailable");
  await logEvent(client, me, "project_created", {
    project_id: data.id,
    mode: parsed.data.mode,
    channel: parsed.data.channel,
  });
  return ok({ id: data.id });
}

async function setArchived(client: Client, id: string, archived: boolean): Promise<ActionResult> {
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const { data, error } = await client
    .from("projects")
    .update({ archived_at: archived ? new Date().toISOString() : null, updated_by: me.id })
    .eq("id", id)
    .select("id");
  if (error) return fail("unavailable");
  if (!data || data.length === 0) return fail("not_found");
  return ok(undefined);
}

/** O10 archiveProject / unarchiveProject (AC7.5). */
export const archiveProject = (client: Client, id: string) => setArchived(client, id, true);
export const unarchiveProject = (client: Client, id: string) => setArchived(client, id, false);

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** O11 listProjects (AC7.3): newest first, 25 per page, cursor = "<updated_at>|<id>". */
export async function listProjects(
  client: Client,
  input: ListProjectsInput,
): Promise<ActionResult<{ items: ProjectRow[]; nextCursor: string | null }>> {
  const parsed = listProjectsSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const { filter, search, cursor } = parsed.data;
  let q = client
    .from("projects")
    .select(
      "id, name, mode, channel, client_label, status, current_stage, updated_at, updater:members!projects_updated_by_members_id_fk(display_name, email)",
    )
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE + 1);
  q = filter === "archived" ? q.not("archived_at", "is", null) : q.is("archived_at", null);
  if (search) q = q.ilike("name", `%${escapeLike(search)}%`);
  if (cursor) {
    const [u, id] = cursor.split("|");
    if (u && id) q = q.or(`updated_at.lt.${u},and(updated_at.eq.${u},id.lt.${id})`);
  }
  const { data, error } = await q;
  if (error || !data) return fail("unavailable");
  const page = data.slice(0, PAGE);
  const items: ProjectRow[] = page.map((p) => {
    const u = Array.isArray(p.updater) ? p.updater[0] : p.updater;
    return {
      id: p.id,
      name: p.name,
      mode: p.mode,
      channel: p.channel,
      clientLabel: p.client_label,
      status: p.status,
      currentStage: p.current_stage,
      updatedAt: p.updated_at,
      updatedByName: u?.display_name || u?.email?.split("@")[0] || "",
    };
  });
  const last = page[page.length - 1];
  return ok({
    items,
    nextCursor: data.length > PAGE && last ? `${last.updated_at}|${last.id}` : null,
  });
}
