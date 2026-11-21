"use server";

import { revalidatePath } from "next/cache";
import * as audit from "@/lib/audit/service";
import { createClient } from "@/lib/supabase/server";

export async function startQuickAudit(projectId: string, emailId: string) {
  const res = await audit.startQuickAudit(await createClient(), emailId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
export async function getEmailAudit(emailId: string) {
  return audit.getEmailAudit(await createClient(), emailId);
}
