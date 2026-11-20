import { readFileSync, existsSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIsolatedUser, sql } from "../helpers/supabase";
import { addEmail } from "@/lib/email/service";
import { getEmailRender, renderAndStore } from "@/lib/email/renderService";

// O38 renderEmail (AC31.4, AC31.5): render at phone width, measure, store, and read back.
// Needs a local browser (see render.test.ts); skipped if there is none.
const CHROME =
  process.env.CHROMIUM_EXECUTABLE_PATH ?? "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
const db = sql();
afterAll(() => db.end());

describe.skipIf(!existsSync(CHROME))("O38 render and store", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let b: Awaited<ReturnType<typeof createIsolatedUser>>;
  let emailId: string;

  beforeAll(async () => {
    process.env.CHROMIUM_EXECUTABLE_PATH = CHROME;
    a = await createIsolatedUser();
    b = await createIsolatedUser();
    const p = await a.client
      .from("projects")
      .insert({
        workspace_id: a.workspaceId,
        name: "Render",
        mode: "optimise",
        channel: "email",
        created_by: a.id,
        updated_by: a.id,
      })
      .select("id")
      .single();
    const res = await addEmail(a.client, {
      source: "paste",
      projectId: p.data!.id,
      subject: "Welcome to Examplebank",
      html: readFileSync("fixtures/emails/welcome.html", "utf8"),
    });
    if (!res.ok) throw new Error(res.code);
    emailId = res.data.id;
  });

  it("renders, measures and stores the picture; the member can read it back", async () => {
    expect(await getEmailRender(a.client, emailId, false)).toBeNull();
    const res = await renderAndStore(a.client, { emailId, images: false });
    if (!res.ok) throw new Error(res.code);
    const v = res.data;
    expect(v.images).toBe(false);
    expect(v.width).toBe(375);
    expect(v.measured.imagesOn).toBe(false);
    expect(v.measured.responsive).toBe(false); // the sample is a fixed 600 px email
    expect(v.measured.links.find((l) => l.text === "Verify my identity")).toMatchObject({
      kind: "button",
      primary: true,
      aboveFold: true,
    });
    expect(v.measured.preheader.present).toBe(true);
    expect(v.url).toContain("renders");
    const png = await (await fetch(v.url!)).arrayBuffer();
    expect(Buffer.from(png).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    const again = await getEmailRender(a.client, emailId, false);
    expect(again?.id).toBe(v.id);
    expect(again?.measured.words).toBe(v.measured.words);
  }, 90_000);

  it("rendering again replaces it (one per images setting); the audit uses the last choice", async () => {
    const [before] =
      await db`select id from public.email_renders where email_id = ${emailId}::uuid and images = false`;
    const res = await renderAndStore(a.client, { emailId, images: false });
    if (!res.ok) throw new Error(res.code);
    expect(res.data.id).toBe(before!.id);
    const on = await renderAndStore(a.client, { emailId, images: true });
    expect(on.ok).toBe(true);
    const rows =
      await db`select images from public.email_renders where email_id = ${emailId}::uuid order by images`;
    expect(rows.map((r) => r.images)).toEqual([false, true]);
    const [e] = await db`select images_loaded from public.emails where id = ${emailId}::uuid`;
    expect(e!.images_loaded).toBe(true);
    await renderAndStore(a.client, { emailId, images: false });
    const [e2] = await db`select images_loaded from public.emails where id = ${emailId}::uuid`;
    expect(e2!.images_loaded).toBe(false);
  }, 120_000);

  it("another workspace can't render or read it", async () => {
    expect(await renderAndStore(b.client, { emailId, images: false })).toEqual({
      ok: false,
      code: "not_found",
    });
    expect(await getEmailRender(b.client, emailId, false)).toBeNull();
  }, 60_000);
});
