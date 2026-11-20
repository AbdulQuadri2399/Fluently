"use server";

import { revalidatePath } from "next/cache";
import * as email from "@/lib/email/service";
import { createClient } from "@/lib/supabase/server";

export async function addEmail(input: email.AddEmailInput) {
  const res = await email.addEmail(await createClient(), input);
  revalidatePath(`/projects/${input.projectId}`, "layout");
  return res;
}
export async function removeEmail(projectId: string, emailId: string) {
  const res = await email.removeEmail(await createClient(), emailId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
export async function getEmailForNode(nodeId: string) {
  return email.emailForNode(await createClient(), nodeId);
}
