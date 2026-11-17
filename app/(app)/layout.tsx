import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { signOut } from "@/lib/actions/auth";
import { completeOnboarding } from "@/lib/actions/members";
import { createProject } from "@/lib/actions/projects";
import { currentMember } from "@/lib/projects/service";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const me = await currentMember(supabase);
  if (!me) redirect("/sign-in");
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(8);
  return (
    <TooltipProvider>
      <AppShell
        email={me.email}
        projects={projects ?? []}
        signOut={signOut}
        showOnboarding={!me.onboarded_at}
        completeOnboarding={completeOnboarding}
        createProject={createProject}
      >
        {children}
      </AppShell>
      <Toaster />
    </TooltipProvider>
  );
}
