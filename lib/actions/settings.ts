"use server";

import { revalidatePath } from "next/cache";
import * as service from "@/lib/settings/service";
import type { AllowEntryInput, WorkspaceSettingsInput } from "@/lib/schemas/settings";
import { createClient } from "@/lib/supabase/server";

async function done<T extends { ok: boolean }>(res: T): Promise<T> {
  if (res.ok) revalidatePath("/settings");
  return res;
}

export async function updateWorkspaceSettings(input: WorkspaceSettingsInput) {
  return done(await service.updateWorkspaceSettings(await createClient(), input));
}
export async function addAllowEntry(input: AllowEntryInput) {
  return done(await service.addAllowEntry(await createClient(), input));
}
export async function removeAllowEntry(id: string) {
  return done(await service.removeAllowEntry(await createClient(), id));
}
export async function setMemberRole(memberId: string, role: "admin" | "member") {
  return done(await service.setMemberRole(await createClient(), memberId, role));
}
export async function setMemberActive(memberId: string, active: boolean) {
  return done(await service.setMemberActive(await createClient(), memberId, active));
}
