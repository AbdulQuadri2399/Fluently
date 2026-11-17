import { notFound } from "next/navigation";
import { ProjectShell } from "@/components/canvas/ProjectShell";
import { signIn } from "@/lib/actions/auth";
import {
  archiveProject,
  deleteProject,
  unarchiveProject,
  updateProject,
} from "@/lib/actions/projects";
import { loadHeader } from "@/lib/canvas/load";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectLayout({ children, params }: LayoutProps<"/projects/[id]">) {
  const { id } = await params;
  const header = await loadHeader(await createClient(), id);
  if (!header) notFound();
  return (
    <ProjectShell
      header={header}
      signIn={signIn}
      projectActions={{
        update: updateProject,
        archive: archiveProject,
        restore: unarchiveProject,
        remove: deleteProject,
      }}
    >
      {children}
    </ProjectShell>
  );
}
