"use server";

import { revalidatePath } from "next/cache";
import * as canvas from "@/lib/canvas/service";
import { startResearch } from "@/lib/jobs/run";
import * as stages from "@/lib/stages/service";
import { createClient } from "@/lib/supabase/server";

export async function startStage(projectId: string) {
  const res = await stages.startStage(await createClient(), projectId, "research");
  if (res.ok) startResearch(res.data.stageRunId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return res.ok ? res : { ok: false as const, code: res.code };
}
export async function cancelStage(projectId: string, runId: string) {
  const res = await stages.cancelStage(await createClient(), runId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
export async function reorderNodes(projectId: string, ids: string[]) {
  return canvas.reorderNodes(await createClient(), projectId, ids);
}
export async function getNodeHistory(nodeId: string) {
  return canvas.nodeHistory(await createClient(), nodeId);
}
export async function updateNode(projectId: string, input: canvas.UpdateNodeInput) {
  const res = await canvas.updateNode(await createClient(), input);
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
export async function addSource(input: canvas.AddSourceInput) {
  const res = await canvas.addSource(await createClient(), input);
  revalidatePath(`/projects/${input.projectId}`, "layout");
  return res;
}
export async function approveResearch(projectId: string, selection: string[]) {
  const res = await stages.approveCheckpoint(
    await createClient(),
    projectId,
    "research",
    selection,
  );
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
export async function sendBackResearch(projectId: string, feedback: string, replaceHuman: boolean) {
  const res = await stages.sendBackResearch(
    await createClient(),
    projectId,
    feedback,
    replaceHuman,
  );
  if (res.ok) startResearch(res.data.stageRunId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
export async function retryResearch(projectId: string, runId: string, synthesisOnly: boolean) {
  const res = await stages.retryResearch(await createClient(), runId, synthesisOnly);
  if (res.ok) startResearch(res.data.stageRunId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
export async function getNodeEvidence(nodeId: string) {
  return canvas.nodeEvidence(await createClient(), nodeId);
}
export async function moveAssets(projectId: string, uploadIds: string[], toNodeId: string | null) {
  const res = await canvas.moveAssets(await createClient(), projectId, uploadIds, toNodeId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
export async function raiseProjectCap(projectId: string, capGbp: number) {
  const res = await stages.raiseProjectCap(await createClient(), projectId, capGbp);
  if (res.ok && res.data.resumedRunId) startResearch(res.data.resumedRunId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
export async function confirmOverCap(projectId: string, runId: string) {
  const res = await stages.confirmOverCap(await createClient(), runId);
  if (res.ok) startResearch(res.data.stageRunId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
export async function getRunActivity(runId: string) {
  return canvas.runActivity(await createClient(), runId);
}
export async function getTrace(nodeId: string) {
  return canvas.getTrace(await createClient(), nodeId);
}

export async function addNode(input: canvas.AddNodeInput) {
  const res = await canvas.addNode(await createClient(), input);
  revalidatePath(`/projects/${input.projectId}`, "layout");
  return res;
}
export async function deleteNode(projectId: string, nodeId: string) {
  const res = await canvas.deleteNode(await createClient(), nodeId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
export async function restoreNode(projectId: string, nodeId: string) {
  const res = await canvas.restoreNode(await createClient(), nodeId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
export async function mergeNodes(projectId: string, nodeIds: string[], title: string) {
  const res = await canvas.mergeNodes(await createClient(), { nodeIds, title });
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
export async function connectNodes(projectId: string, fromId: string, toId: string) {
  const res = await canvas.connectNodes(await createClient(), fromId, toId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
export async function disconnectEdge(projectId: string, edgeId: string) {
  const res = await canvas.disconnectEdge(await createClient(), edgeId);
  revalidatePath(`/projects/${projectId}`, "layout");
  return res;
}
