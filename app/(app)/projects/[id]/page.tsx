import { notFound } from "next/navigation";
import { channelNames, stageNames } from "@/components/projects/copy";
import { createClient } from "@/lib/supabase/server";

/** Project page. The brief (Slice 4) and the tree (Slice 5) fill this in. */
export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, channel, current_stage")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();
  return (
    <main className="mx-auto grid w-full max-w-[880px] gap-2 px-14 py-11">
      <p className="text-small text-muted">
        {channelNames[project.channel] ?? project.channel} ·{" "}
        {stageNames[project.current_stage] ?? project.current_stage}
      </p>
      <h1 className="text-page font-semibold tracking-[-0.03em]">{project.name}</h1>
    </main>
  );
}
