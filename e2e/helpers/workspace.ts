import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

/**
 * A brand-new workspace (its own invite domain) with one confirmed member who hasn't seen
 * the introduction yet. Used for first-use states. Test setup only: uses server-side keys.
 */
export async function freshWorkspaceUser(): Promise<{ email: string; password: string }> {
  const domain = `ws${Date.now()}${Math.floor(Math.random() * 1e5)}.test`;
  const db = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => undefined });
  try {
    const [ws] = await db<{ id: string }[]>`
      insert into public.workspaces (name) values (${`E2E ${domain}`}) returning id`;
    await db`insert into public.allowlist_entries (workspace_id, value, kind)
             values (${ws!.id}, ${`@${domain}`}, 'domain')`;
  } finally {
    await db.end();
  }
  const email = `first@${domain}`;
  const password = "a-long-enough-password";
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(error.message);
  return { email, password };
}

/** Like freshWorkspaceUser, but the member is the workspace's admin (can upload a toolkit). */
export async function freshWorkspaceAdmin(): Promise<{ email: string; password: string }> {
  const who = await freshWorkspaceUser();
  const db = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => undefined });
  try {
    await db`update public.members set role = 'admin' where email = ${who.email}`;
  } finally {
    await db.end();
  }
  return who;
}

/** Service-role database client for test setup only. */
export function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    },
  );
}

/** A project whose brief is approved and ethics passed, with its two objective cards. */
export async function seedApprovedProject(email: string): Promise<string> {
  const db = serviceClient();
  const { data: m } = await db
    .from("members")
    .select("id, workspace_id")
    .eq("email", email)
    .single();
  if (!m) throw new Error("member not found");
  const { data: p, error: pe } = await db
    .from("projects")
    .insert({
      workspace_id: m.workspace_id,
      name: "Seeded tree",
      mode: "new",
      channel: "screens",
      created_by: m.id,
      updated_by: m.id,
      current_stage: "research",
      status: "waiting",
    })
    .select("id")
    .single();
  if (pe) throw new Error(`project: ${pe.message}`);
  const projectId = p!.id as string;
  await db
    .from("intakes")
    .update({
      business_objective: "Raise ID checks by 15%",
      behavioural_objective: "Upload ID on day one",
      sector: "Banking",
      approved_at: new Date().toISOString(),
      approved_by: m.id,
    })
    .eq("project_id", projectId);
  const base = {
    workspace_id: m.workspace_id,
    project_id: projectId,
    provenance: "human",
    created_by: m.id,
  };
  const { error: ne } = await db.from("nodes").insert([
    {
      ...base,
      type: "objective",
      stage: "intake",
      title: "Business objective",
      data: { kind: "business", text: "Raise ID checks by 15%" },
      sort_order: 0,
    },
    {
      ...base,
      type: "objective",
      stage: "intake",
      title: "Behavioural objective",
      data: { kind: "behavioural", text: "Upload ID on day one" },
      sort_order: 1,
    },
    {
      ...base,
      type: "ethics",
      stage: "ethics",
      title: "Ethics check passed",
      data: { result: "pass", reasons: [] },
      provenance: "ai",
      sort_order: 2,
    },
  ]);
  if (ne) throw new Error(`nodes: ${ne.message}`);
  return projectId;
}
