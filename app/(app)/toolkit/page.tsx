import { redirect } from "next/navigation";
import { PageLoadError } from "@/components/projects/RetryButton";
import { ToolkitPage } from "@/components/toolkit/ToolkitPage";
import { saveToolkitVersion } from "@/lib/actions/toolkit";
import { currentMember } from "@/lib/projects/service";
import { createClient } from "@/lib/supabase/server";
import { listToolkitVersions, nextVersionNumber } from "@/lib/toolkit/service";

export const metadata = { title: "Toolkit" };

/** SCR11 Toolkit. */
export default async function Page() {
  const supabase = await createClient();
  const me = await currentMember(supabase);
  if (!me) redirect("/sign-in");
  const [versions, next] = await Promise.all([
    listToolkitVersions(supabase),
    nextVersionNumber(supabase),
  ]);
  if (!versions.ok) return <PageLoadError />;
  return (
    <ToolkitPage
      isAdmin={me.role === "admin"}
      versions={versions.data}
      nextNumber={next}
      save={saveToolkitVersion}
    />
  );
}
