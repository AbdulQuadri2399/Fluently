import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectCanvas } from "@/components/canvas/ProjectCanvas";
import * as actions from "@/lib/actions/canvas";
import { loadTree } from "@/lib/canvas/load";
import { createClient } from "@/lib/supabase/server";

/** SCR5 project canvas. */
export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const tree = await loadTree(await createClient(), id);
  if (!tree) notFound();
  return (
    <Suspense>
      <ProjectCanvas
        tree={tree}
        actions={{
          startStage: actions.startStage,
          cancelStage: actions.cancelStage,
          reorderNodes: actions.reorderNodes,
          getNodeHistory: actions.getNodeHistory,
        }}
      />
    </Suspense>
  );
}
