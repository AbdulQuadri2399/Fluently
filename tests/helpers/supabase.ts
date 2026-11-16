import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import postgres from "postgres";

const url = () => required("NEXT_PUBLIC_SUPABASE_URL");

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing: run \`supabase start\` and create .env.test`);
  return v;
}

export const PASSWORD = "password-test-123";

/** Direct database connection as the postgres superuser (test setup only). */
export function sql() {
  return postgres(required("DATABASE_URL"), { max: 1, onnotice: () => undefined });
}

export function adminClient(): SupabaseClient {
  return createClient(url(), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(): SupabaseClient {
  return createClient(url(), required("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function uniqueEmail(domain: string): string {
  return `t${Date.now()}${Math.floor(Math.random() * 1e6)}@${domain}`;
}

/** Creates a confirmed auth user (goes through the allowlist trigger) and returns a signed-in client. */
export async function createSignedInUser(
  email: string,
): Promise<{ client: SupabaseClient; id: string }> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const client = anonClient();
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw new Error(`signIn failed: ${signIn.error.message}`);
  return { client, id: data.user.id };
}

/** Ensures a second workspace allowlisting `@other.test` exists, for cross-workspace RLS tests. */
export async function ensureOtherWorkspace(): Promise<string> {
  const db = sql();
  try {
    const existing = await db<{ id: string }[]>`
      select workspace_id as id from public.allowlist_entries where value = '@other.test' limit 1`;
    if (existing[0]) return existing[0].id;
    const [ws] = await db<{ id: string }[]>`
      insert into public.workspaces (name) values ('Other WS') returning id`;
    if (!ws) throw new Error("workspace insert failed");
    await db`insert into public.allowlist_entries (workspace_id, value, kind)
             values (${ws.id}, '@other.test', 'domain')`;
    return ws.id;
  } finally {
    await db.end();
  }
}
