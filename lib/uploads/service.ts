import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { currentMember } from "@/lib/projects/service";
import type { Database } from "@/lib/supabase/database.types";
import { parseEml } from "./eml";
import { checkFile, extensionOf, safeName, uploadRule } from "./rules";

type Client = SupabaseClient<Database>;

const kindSchema = z.enum(["asset", "client_data"]);
const requestSchema = z.object({
  projectId: z.uuid(),
  kind: kindSchema,
  fileName: z.string().min(1).max(255),
  mime: z.string().max(200),
  size: z.number().int(),
});
export type UploadRequest = z.input<typeof requestSchema>;

export type UploadRow = {
  id: string;
  kind: "asset" | "client_data";
  fileName: string;
  mime: string;
  sizeBytes: number;
  meta: Record<string, unknown>;
};

async function projectFor(client: Client, projectId: string) {
  const { data } = await client
    .from("projects")
    .select("id, workspace_id, channel")
    .eq("id", projectId)
    .maybeSingle();
  return data;
}

/** O14 createUploadUrl: checks type, size and count, then returns a one-time upload link. */
export async function createUploadUrl(
  client: Client,
  input: UploadRequest,
): Promise<ActionResult<{ path: string; token: string }>> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const { projectId, kind, fileName, size } = parsed.data;
  const project = await projectFor(client, projectId);
  if (!project) return fail("not_found");
  const channel = project.channel as "screens" | "email";
  if (checkFile({ name: fileName, size }, kind, channel) !== "ok") return fail("validation");
  const { count } = await client
    .from("uploads")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("kind", kind);
  if ((count ?? 0) >= uploadRule(kind, channel).maxFiles) return fail("validation");

  const path = `${project.workspace_id}/${projectId}/${crypto.randomUUID()}-${safeName(fileName)}`;
  const { data, error } = await client.storage.from("uploads").createSignedUploadUrl(path);
  if (error || !data) return fail("unavailable");
  return ok({ path, token: data.token });
}

/** O14 confirmUpload: records a stored file; reads subject and HTML out of .eml emails. */
export async function confirmUpload(
  client: Client,
  input: UploadRequest & { path: string },
): Promise<ActionResult<UploadRow>> {
  const parsed = requestSchema.extend({ path: z.string().min(1).max(500) }).safeParse(input);
  if (!parsed.success) return fail("validation");
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const { projectId, kind, fileName, mime, size, path } = parsed.data;
  const project = await projectFor(client, projectId);
  if (!project) return fail("not_found");
  if (!path.startsWith(`${project.workspace_id}/${projectId}/`)) return fail("validation");
  if (checkFile({ name: fileName, size }, kind, project.channel as "screens" | "email") !== "ok") {
    return fail("validation");
  }

  let meta: Record<string, unknown> = {};
  if (extensionOf(fileName) === "eml") {
    const file = await client.storage.from("uploads").download(path);
    if (file.error || !file.data) return fail("unavailable");
    const { subject, html } = parseEml(await file.data.text());
    meta = { subject, html };
  }
  const { data, error } = await client
    .from("uploads")
    .insert({
      workspace_id: project.workspace_id,
      project_id: projectId,
      kind,
      storage_path: path,
      file_name: fileName,
      mime: mime || "application/octet-stream",
      size_bytes: size,
      meta: meta as Database["public"]["Tables"]["uploads"]["Insert"]["meta"],
      uploaded_by: me.id,
    })
    .select("id, kind, file_name, mime, size_bytes, meta")
    .single();
  if (error || !data) return fail("unavailable");
  return ok(toRow(data));
}

function toRow(d: {
  id: string;
  kind: string;
  file_name: string;
  mime: string;
  size_bytes: number;
  meta: unknown;
}): UploadRow {
  return {
    id: d.id,
    kind: d.kind as UploadRow["kind"],
    fileName: d.file_name,
    mime: d.mime,
    sizeBytes: d.size_bytes,
    meta: (d.meta ?? {}) as Record<string, unknown>,
  };
}

export async function listUploads(
  client: Client,
  projectId: string,
): Promise<ActionResult<UploadRow[]>> {
  const { data, error } = await client
    .from("uploads")
    .select("id, kind, file_name, mime, size_bytes, meta")
    .eq("project_id", projectId)
    .order("created_at");
  if (error) return fail("unavailable");
  return ok((data ?? []).map(toRow));
}

/** O14 removeUpload: deletes the file and its record. */
export async function removeUpload(client: Client, id: string): Promise<ActionResult> {
  const { data } = await client.from("uploads").select("storage_path").eq("id", id).maybeSingle();
  if (!data) return fail("not_found");
  await client.storage.from("uploads").remove([data.storage_path]);
  const del = await client.from("uploads").delete().eq("id", id).select("id");
  if (del.error) return fail("unavailable");
  return ok(undefined);
}
