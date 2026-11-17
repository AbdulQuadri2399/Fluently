import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { currentMember } from "./service";

/** What the home and projects pages need about the signed-in person and their workspace. */
export async function pageContext(client: SupabaseClient<Database>) {
  const me = await currentMember(client);
  if (!me) return null;
  const { data: ws } = await client
    .from("workspaces")
    .select("default_toolkit_version_id")
    .eq("id", me.workspace_id)
    .single();
  return {
    me,
    isAdmin: me.role === "admin",
    hasToolkit: Boolean(ws?.default_toolkit_version_id),
    firstName: firstName(me.display_name, me.email),
  };
}

export function firstName(displayName: string | null, email: string): string {
  if (displayName?.trim()) return displayName.trim().split(/\s+/)[0] ?? displayName;
  const local = email.split("@")[0] ?? email;
  const word = local.split(/[._-]+/)[0] ?? local;
  return word.charAt(0).toUpperCase() + word.slice(1);
}
