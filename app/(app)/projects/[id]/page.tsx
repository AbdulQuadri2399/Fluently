import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectCanvasScreen } from "@/components/canvas/ProjectCanvasScreen";
import { loadHeader, loadTree } from "@/lib/canvas/load";
import { createClient } from "@/lib/supabase/server";

/** SCR5 project canvas. */
export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const client = await createClient();
  const [tree, header] = await Promise.all([loadTree(client, id), loadHeader(client, id)]);
  if (!tree) notFound();
  return (
    <Suspense>
      <ProjectCanvasScreen
        tree={tree}
        budget={header ? { spentGbp: header.spentGbp, capGbp: header.capGbp } : undefined}
      />
    </Suspense>
  );
}
