import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { currentMember } from "@/lib/projects/service";
import type { Database, Json } from "@/lib/supabase/database.types";
import { extensionOf } from "@/lib/uploads/rules";
import { parseEml } from "@/lib/uploads/eml";
import { splitEmail, type EmailParts } from "./parts";

type Client = SupabaseClient<Database>;

export const MAX_EMAILS = 20;
export const MAX_HTML_CHARS = 1_000_000;

const subject = z.string().trim().min(1).max(300);
export const addEmailSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("paste"),
    projectId: z.uuid(),
    subject,
    html: z.string().min(1).max(MAX_HTML_CHARS),
  }),
  z.object({
    source: z.enum(["html", "eml"]),
    projectId: z.uuid(),
    uploadId: z.uuid(),
    subject: subject.optional(),
  }),
]);
export type AddEmailInput = z.input<typeof addEmailSchema>;

export type EmailRow = {
  id: string;
  nodeId: string | null;
  subject: string;
  source: string;
  createdAt: string;
};

/** O37 addEmail (AC31.2, AC31.3, AC31.9): paste HTML, or use an uploaded `.html` or `.eml` file. */
export async function addEmail(
  client: Client,
  input: AddEmailInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = addEmailSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const v = parsed.data;

  let html: string;
  let subjectLine: string;
  let uploadId: string | null = null;
  if (v.source === "paste") {
    html = v.html;
    subjectLine = v.subject;
  } else {
    const { data: up } = await client
      .from("uploads")
      .select("id, file_name, storage_path, project_id, kind")
      .eq("id", v.uploadId)
      .maybeSingle();
    if (!up || up.project_id !== v.projectId || up.kind !== "asset") return fail("not_found");
    const ext = extensionOf(up.file_name);
    if (v.source === "eml" ? ext !== "eml" : ext !== "html" && ext !== "htm")
      return fail("validation");
    const file = await client.storage.from("uploads").download(up.storage_path);
    if (file.error || !file.data) return fail("unavailable");
    const text = await file.data.text();
    uploadId = up.id;
    if (v.source === "eml") {
      const eml = parseEml(text);
      if (!eml.html) return fail("validation");
      html = eml.html;
      subjectLine = eml.subject.trim() || v.subject || "";
    } else {
      html = text;
      subjectLine = v.subject ?? "";
    }
  }
  subjectLine = subjectLine.trim();
  if (!subjectLine || subjectLine.length > 300 || !html.trim() || html.length > MAX_HTML_CHARS)
    return fail("validation");

  const parts = splitEmail(html, subjectLine);
  const { data, error } = await client.rpc("add_email", {
    p_project: v.projectId,
    p_source: v.source,
    p_subject: subjectLine,
    p_html: html,
    p_parts: parts as unknown as Json,
    p_upload: uploadId as string,
  });
  if (error) {
    if (error.code === "P0002") return fail("not_found");
    if (error.code === "P0009") return fail("too_many");
    if (error.code === "22023") return fail("validation");
    return fail("unavailable");
  }
  return ok({ id: data as string });
}

/** O37 removeEmail (AC31.2): removes the email and its card; what it fed is marked out of date. */
export async function removeEmail(client: Client, emailId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(emailId).success) return fail("validation");
  const { error } = await client.rpc("remove_email", { p_email: emailId });
  if (error) return fail(error.code === "P0002" ? "not_found" : "unavailable");
  return ok(undefined);
}

/** The emails on a project, oldest first, for the brief. */
export async function listEmails(client: Client, projectId: string): Promise<EmailRow[]> {
  const { data } = await client
    .from("emails")
    .select("id, node_id, subject, source, created_at")
    .eq("project_id", projectId)
    .order("created_at");
  return (data ?? []).map((e) => ({
    id: e.id,
    nodeId: e.node_id,
    subject: e.subject,
    source: e.source,
    createdAt: e.created_at,
  }));
}

export type EmailDetail = {
  id: string;
  source: string;
  parts: EmailParts;
  imagesLoaded: boolean;
};

/** The parts of the email behind a canvas card, for the details panel. */
export async function emailForNode(client: Client, nodeId: string): Promise<EmailDetail | null> {
  const { data } = await client
    .from("emails")
    .select("id, source, parts, images_loaded")
    .eq("node_id", nodeId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    source: data.source,
    parts: data.parts as unknown as EmailParts,
    imagesLoaded: data.images_loaded,
  };
}
