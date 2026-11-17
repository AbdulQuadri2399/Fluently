import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectCanvasScreen } from "@/components/canvas/ProjectCanvasScreen";
import { loadTree } from "@/lib/canvas/load";
import { createClient } from "@/lib/supabase/server";

/** SCR5 project canvas. */
export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const tree = await loadTree(await createClient(), id);
  if (!tree) notFound();
  return (
    <Suspense>
      <ProjectCanvasScreen tree={tree} />
    </Suspense>
  );
}
