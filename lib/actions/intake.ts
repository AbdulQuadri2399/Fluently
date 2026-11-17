"use server";

import { revalidatePath } from "next/cache";
import { getAiClient } from "@/lib/ai";
import * as approval from "@/lib/intake/approve";
import * as intake from "@/lib/intake/service";
import { startEthicsGate } from "@/lib/jobs/run";
import type { CoachInput, ResolveInput, SaveFieldInput } from "@/lib/schemas/intake";
import { createClient } from "@/lib/supabase/server";
import * as uploads from "@/lib/uploads/service";

const refresh = (projectId: string) => revalidatePath(`/projects/${projectId}`, "layout");

export async function saveIntakeField(input: SaveFieldInput) {
  return intake.saveIntakeField(await createClient(), input);
}
export async function coachField(input: CoachInput) {
  return intake.coachField(await createClient(), input, { ai: getAiClient() });
}
export async function resolveSuggestion(input: ResolveInput) {
  return intake.resolveSuggestion(await createClient(), input);
}
export async function createUploadUrl(input: uploads.UploadRequest) {
  return uploads.createUploadUrl(await createClient(), input);
}
export async function confirmUpload(input: uploads.UploadRequest & { path: string }) {
  return uploads.confirmUpload(await createClient(), input);
}
export async function removeUpload(id: string) {
  return uploads.removeUpload(await createClient(), id);
}
export async function approveObjectives(projectId: string) {
  const res = await approval.approveObjectives(await createClient(), projectId);
  if (res.ok) startEthicsGate(res.data.stageRunId);
  refresh(projectId);
  return res;
}
export async function editApprovedIntake(projectId: string) {
  const res = await approval.editApprovedIntake(await createClient(), projectId);
  refresh(projectId);
  return res;
}
export async function recordOverride(projectId: string, nodeId: string, reason: string) {
  const res = await approval.recordOverride(await createClient(), { nodeId, reason });
  refresh(projectId);
  return res;
}
export async function retryEthics(projectId: string) {
  const res = await approval.retryEthics(await createClient(), projectId);
  if (res.ok) startEthicsGate(res.data.stageRunId);
  refresh(projectId);
  return res;
}
