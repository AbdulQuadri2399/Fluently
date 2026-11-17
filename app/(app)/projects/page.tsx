import { redirect } from "next/navigation";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import { ProjectsList } from "@/components/projects/ProjectsList";
import { PageLoadError } from "@/components/projects/RetryButton";
import { EmptyProjects, ToolkitBanner } from "@/components/projects/States";
import { projectsCopy as c } from "@/components/projects/copy";
import {
  archiveProject,
  createProject,
  listProjects,
  unarchiveProject,
} from "@/lib/actions/projects";
import * as service from "@/lib/projects/service";
import { pageContext } from "@/lib/projects/workspace";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Projects" };

/** SCR3 Projects (AC7.3, AC25.4). */
export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const sp = await searchParams;
  const filter = sp.filter === "archived" ? "archived" : "active";
  const search = typeof sp.search === "string" ? sp.search.slice(0, 80) : "";
  const supabase = await createClient();
  const ctx = await pageContext(supabase);
  if (!ctx) redirect("/sign-in");
  const res = await service.listProjects(supabase, { filter, search: search || undefined });

  // First use: no projects at all (active, unfiltered, nothing archived either).
  let firstUse = false;
  if (res.ok && res.data.items.length === 0 && filter === "active" && !search) {
    const { count } = await supabase.from("projects").select("id", { count: "exact", head: true });
    firstUse = (count ?? 0) === 0;
  }

  return (
    <main className="mx-auto grid w-full max-w-[1040px] gap-6 px-14 py-11">
      <div className="flex items-center justify-between">
        <h1 className="text-page font-semibold tracking-[-0.03em]">{c.title}</h1>
        {firstUse ? null : <NewProjectDialog action={createProject} />}
      </div>
      {ctx.hasToolkit ? null : <ToolkitBanner isAdmin={ctx.isAdmin} />}
      {!res.ok ? (
        <PageLoadError />
      ) : firstUse ? (
        <EmptyProjects action={<NewProjectDialog action={createProject} />} />
      ) : (
        <ProjectsList
          key={`${filter}|${search}`}
          initial={res.data}
          filter={filter}
          search={search}
          list={listProjects}
          archive={archiveProject}
          restore={unarchiveProject}
        />
      )}
    </main>
  );
}
