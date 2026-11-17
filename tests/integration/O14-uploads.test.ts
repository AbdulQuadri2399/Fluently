import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIsolatedUser, sql } from "../helpers/supabase";
import { createProject } from "@/lib/projects/service";
import { confirmUpload, createUploadUrl, listUploads, removeUpload } from "@/lib/uploads/service";

// O14 createUploadUrl / confirmUpload / removeUpload (AC8.6–AC8.8, FF3).
const db = sql();
afterAll(() => db.end());

const EML = [
  "From: Lumen <hello@lumen.example>",
  "Subject: =?utf-8?Q?Your_switch_is_nearly_done?=",
  'Content-Type: multipart/alternative; boundary="b1"',
  "",
  "--b1",
  "Content-Type: text/plain",
  "",
  "Plain version",
  "--b1",
  "Content-Type: text/html; charset=utf-8",
  "Content-Transfer-Encoding: quoted-printable",
  "",
  "<h1>Almost there</h1><p>One step =3D one click.</p>",
  "--b1--",
  "",
].join("\r\n");

describe("O14 uploads", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let screensProject: string;
  let emailProject: string;

  beforeAll(async () => {
    a = await createIsolatedUser();
    const s = await createProject(a.client, {
      name: "Screens",
      mode: "optimise",
      channel: "screens",
    });
    const e = await createProject(a.client, { name: "Emails", mode: "optimise", channel: "email" });
    if (!s.ok || !e.ok) throw new Error("project");
    screensProject = s.data.id;
    emailProject = e.data.id;
  });

  async function upload(
    projectId: string,
    kind: "asset" | "client_data",
    fileName: string,
    body: string,
    mime: string,
  ) {
    const size = new TextEncoder().encode(body).length;
    const url = await createUploadUrl(a.client, { projectId, kind, fileName, mime, size });
    if (!url.ok) return url;
    const put = await a.client.storage
      .from("uploads")
      .uploadToSignedUrl(url.data.path, url.data.token, new Blob([body], { type: mime }));
    if (put.error) throw new Error(put.error.message);
    return confirmUpload(a.client, { projectId, kind, fileName, mime, size, path: url.data.path });
  }

  it("allowed types accepted: screenshot asset and CSV client data", async () => {
    expect(
      await upload(screensProject, "asset", "home.png", "png-bytes", "image/png"),
    ).toMatchObject({ ok: true, data: { kind: "asset", fileName: "home.png" } });
    expect(
      await upload(screensProject, "client_data", "reviews.csv", "rating,text\n1,slow", "text/csv"),
    ).toMatchObject({ ok: true });
    const wrong = await createUploadUrl(a.client, {
      projectId: screensProject,
      kind: "asset",
      fileName: "brief.docx",
      mime: "application/msword",
      size: 100,
    });
    expect(wrong).toEqual({ ok: false, code: "validation" });
  });

  it("11 MB image rejected", async () => {
    const res = await createUploadUrl(a.client, {
      projectId: screensProject,
      kind: "asset",
      fileName: "big.png",
      mime: "image/png",
      size: 11 * 1024 * 1024,
    });
    expect(res).toEqual({ ok: false, code: "validation" });
  });

  it("21st asset → validation", async () => {
    const existing = await listUploads(a.client, screensProject);
    const have = existing.ok ? existing.data.filter((u) => u.kind === "asset").length : 0;
    for (let i = have; i < 20; i++) {
      await db`insert into public.uploads (workspace_id, project_id, kind, storage_path, file_name, mime, size_bytes, uploaded_by)
               values (${a.workspaceId}, ${screensProject}, 'asset', ${`${a.workspaceId}/${screensProject}/f${i}.png`}, ${`f${i}.png`}, 'image/png', 10, ${a.id})`;
    }
    const res = await createUploadUrl(a.client, {
      projectId: screensProject,
      kind: "asset",
      fileName: "one-more.png",
      mime: "image/png",
      size: 100,
    });
    expect(res).toEqual({ ok: false, code: "validation" });
  });

  it(".eml yields subject + HTML", async () => {
    const res = await upload(emailProject, "asset", "switch.eml", EML, "message/rfc822");
    if (!res.ok) throw new Error(res.code);
    expect(res.data.meta).toEqual({
      subject: "Your switch is nearly done",
      html: "<h1>Almost there</h1><p>One step = one click.</p>",
    });
  });

  it("remove deletes the record and the file", async () => {
    const res = await upload(emailProject, "asset", "hero.png", "x", "image/png");
    if (!res.ok) throw new Error(res.code);
    expect(await removeUpload(a.client, res.data.id)).toEqual({ ok: true, data: undefined });
    const list = await listUploads(a.client, emailProject);
    expect(list.ok && list.data.some((u) => u.id === res.data.id)).toBe(false);
  });
});
