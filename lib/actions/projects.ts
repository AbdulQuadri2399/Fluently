"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import * as service from "@/lib/projects/service";
import type {
  CreateProjectInput,
  ListProjectsInput,
  UpdateProjectInput,
} from "@/lib/schemas/project";

export async function createProject(input: CreateProjectInput) {
  const res = await service.createProject(await createClient(), input);
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function archiveProject(id: string) {
  const res = await service.archiveProject(await createClient(), id);
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function unarchiveProject(id: string) {
  const res = await service.unarchiveProject(await createClient(), id);
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function listProjects(input: ListProjectsInput) {
  return service.listProjects(await createClient(), input);
}

export async function updateProject(input: UpdateProjectInput) {
  const res = await service.updateProject(await createClient(), input);
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function deleteProject(id: string, confirmName: string) {
  const res = await service.deleteProject(await createClient(), { id, confirmName });
  if (res.ok) revalidatePath("/", "layout");
  return res;
}
