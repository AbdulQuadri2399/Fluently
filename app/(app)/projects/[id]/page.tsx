import { notFound, redirect } from "next/navigation";
import { channelNames, stageNames } from "@/components/projects/copy";
import { toolkitCopy } from "@/components/toolkit/copy";
import { toolkitPin } from "@/lib/toolkit/guard";
import { createClient } from "@/lib/supabase/server";

/** Project page. The brief (Slice 4) and the tree (Slice 5) fill this in. */
export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, name, channel, current_stage, workspace_id, pinned:toolkit_versions!projects_toolkit_version_id_toolkit_versions_id_fk(number)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();
  // Until the tree arrives (Slice 5), a project opens on its brief.
  if (project.current_stage === "intake" || project.current_stage === "ethics")
    redirect(`/projects/${id}/brief`);
  const { data: ws } = await supabase
    .from("workspaces")
    .select(
      "current:toolkit_versions!workspaces_default_toolkit_version_id_toolkit_versions_id_fk(number)",
    )
    .eq("id", project.workspace_id)
    .single();
  const one = <T,>(x: T | T[] | null | undefined) => (Array.isArray(x) ? x[0] : x) ?? null;
  const pin = toolkitPin(one(project.pinned)?.number ?? null, one(ws?.current)?.number ?? null);

  return (
    <main className="mx-auto grid w-full max-w-[880px] gap-2 px-14 py-11">
      <p className="text-small text-muted">
        {channelNames[project.channel] ?? project.channel} ·{" "}
        {stageNames[project.current_stage] ?? project.current_stage}
        {pin.pinned !== null ? (
          <>
            {" · "}
            {toolkitCopy.pinned(pin.pinned)}
            {pin.newer !== null ? ` (${toolkitCopy.newer(pin.newer)})` : null}
          </>
        ) : null}
      </p>
      <h1 className="text-page font-semibold tracking-[-0.03em]">{project.name}</h1>
    </main>
  );
}
