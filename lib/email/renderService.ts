import "server-only";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { currentMember } from "@/lib/projects/service";
import { adminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { createClient } from "@/lib/supabase/server";
import { computeMeasured, type Measured } from "./measure";
import { splitEmail } from "./parts";
import { renderEmail } from "./render";

type Member = Awaited<ReturnType<typeof createClient>>;

export type EmailRenderView = {
  id: string;
  images: boolean;
  width: number;
  height: number;
  /** Short-lived private link to the picture. */
  url: string | null;
  measured: Measured;
  renderedAt: string;
};

const SIGNED_SECONDS = 3600;

async function view(
  client: Member,
  row: {
    id: string;
    images: boolean;
    width: number;
    height: number;
    storage_path: string;
    measured: Json;
    updated_at: string;
  },
): Promise<EmailRenderView> {
  const signed = await client.storage
    .from("uploads")
    .createSignedUrl(row.storage_path, SIGNED_SECONDS);
  return {
    id: row.id,
    images: row.images,
    width: row.width,
    height: row.height,
    url: signed.data?.signedUrl ?? null,
    measured: row.measured as unknown as Measured,
    renderedAt: row.updated_at,
  };
}

/** The stored render of an email, with or without its images (AC31.4); null if there is none yet. */
export async function getEmailRender(
  client: Member,
  emailId: string,
  images: boolean,
): Promise<EmailRenderView | null> {
  const { data } = await client
    .from("email_renders")
    .select("id, images, width, height, storage_path, measured, updated_at")
    .eq("email_id", emailId)
    .eq("images", images)
    .maybeSingle();
  return data ? view(client, data) : null;
}

/**
 * O38 renderEmail (AC31.4, AC31.5): renders the email at phone width, measures it, stores the
 * picture privately and the measurements beside it, and records which render the audit uses. The
 * member must be able to read the email (access rules apply); the files are written with the
 * service role, scoped to that email's own workspace and project.
 */
export async function renderAndStore(
  client: Member,
  input: { emailId: string; images: boolean },
): Promise<ActionResult<EmailRenderView>> {
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const { data: email } = await client
    .from("emails")
    .select("id, workspace_id, project_id, subject, html")
    .eq("id", input.emailId)
    .maybeSingle();
  if (!email) return fail("not_found");

  let rendered;
  try {
    rendered = await renderEmail({ html: email.html, images: input.images });
  } catch (e) {
    console.error("render failed", input.emailId, e);
    return fail("unavailable");
  }
  const measured = computeMeasured({
    links: rendered.raw.links,
    texts: rendered.raw.texts,
    parts: splitEmail(email.html, email.subject),
    layoutWidth: rendered.layoutWidth,
    fullHeight: rendered.raw.layoutHeight,
    imagesOn: input.images,
  });

  const admin = adminClient();
  const path = `${email.workspace_id}/${email.project_id}/renders/${email.id}-${input.images ? "images" : "plain"}.png`;
  const up = await admin.storage
    .from("uploads")
    .upload(path, rendered.png, { contentType: "image/png", upsert: true });
  if (up.error) return fail("unavailable");
  const { data: row, error } = await admin
    .from("email_renders")
    .upsert(
      {
        workspace_id: email.workspace_id,
        project_id: email.project_id,
        email_id: email.id,
        images: input.images,
        storage_path: path,
        width: rendered.width,
        height: rendered.height,
        measured: measured as unknown as NonNullable<Json>,
        rendered_by: me.id,
      },
      { onConflict: "email_id,images" },
    )
    .select("id, images, width, height, storage_path, measured, updated_at")
    .single();
  if (error || !row) return fail("unavailable");
  // The audit uses the render the member last chose (AC31.4).
  await admin.from("emails").update({ images_loaded: input.images }).eq("id", email.id);
  return ok(await view(client, row));
}
