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
