import { redirect } from "next/navigation";
import { PageLoadError } from "@/components/projects/RetryButton";
import { SettingsPage } from "@/components/settings/Settings";
import * as actions from "@/lib/actions/settings";
import { currentMember } from "@/lib/projects/service";
import * as service from "@/lib/settings/service";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };

/** SCR12 Workspace settings. Admin sections load only for admins (AC3.6). */
export default async function Page() {
  const supabase = await createClient();
  const me = await currentMember(supabase);
  if (!me) redirect("/sign-in");
  const settings = await service.getSettings(supabase);
  if (!settings.ok) return <PageLoadError />;
  const usage = await service.usageByProjectStage(supabase, settings.data);
  if (!usage.ok) return <PageLoadError />;

  let admin = null;
  if (me.role === "admin") {
    const [allowlist, members] = await Promise.all([
      service.listAllowlist(supabase),
      service.listMembers(supabase),
    ]);
    if (!allowlist.ok || !members.ok) return <PageLoadError />;
    admin = { settings: settings.data, allowlist: allowlist.data, members: members.data };
  }

  return (
    <SettingsPage
      meId={me.id}
      admin={admin}
      usage={usage.data}
      actions={{
        updateWorkspaceSettings: actions.updateWorkspaceSettings,
        addAllowEntry: actions.addAllowEntry,
        removeAllowEntry: actions.removeAllowEntry,
        setMemberRole: actions.setMemberRole,
        setMemberActive: actions.setMemberActive,
      }}
    />
  );
}
