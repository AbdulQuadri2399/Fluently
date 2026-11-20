import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { researchedProject } from "../helpers/researched";
import { createIsolatedUser, sql } from "../helpers/supabase";
import { addEmail, listEmails, removeEmail, emailForNode } from "@/lib/email/service";

// O37 addEmail / removeEmail (AC31.2, AC31.3, AC31.9).
const db = sql();
afterAll(() => db.end());

const html = readFileSync("fixtures/emails/welcome.html", "utf8");
const eml = readFileSync("fixtures/emails/plain-links.eml", "utf8");

describe("O37 emails", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let b: Awaited<ReturnType<typeof createIsolatedUser>>;
  let projectId: string;

  async function project(user = a) {
    const p = await user.client
      .from("projects")
      .insert({
        workspace_id: user.workspaceId,
        name: "Emails",
        mode: "optimise",
        channel: "email",
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id")
      .single();
    return p.data!.id as string;
  }

  async function upload(user: typeof a, pid: string, name: string, body: string) {
    const path = `${user.workspaceId}/${pid}/${crypto.randomUUID()}-${name}`;
    const up = await user.client.storage.from("uploads").upload(path, new Blob([body]));
    if (up.error) throw new Error(up.error.message);
    const [row] =
      await db`insert into public.uploads (workspace_id, project_id, kind, storage_path, file_name, mime, size_bytes, uploaded_by)
      values (${user.workspaceId}::uuid, ${pid}::uuid, 'asset', ${path}, ${name}, 'text/html', ${body.length}, ${user.id}::uuid) returning id`;
    return row!.id as string;
  }

  beforeAll(async () => {
    a = await createIsolatedUser();
    b = await createIsolatedUser();
    projectId = await project();
  });

  it("paste: stores the email, its parts, and a card under the objectives", async () => {
    const res = await addEmail(a.client, {
      source: "paste",
      projectId,
      subject: "Welcome to Examplebank",
      html,
    });
    if (!res.ok) throw new Error(res.code);
    const [e] =
      await db`select subject, preheader, source, parts, node_id, added_by from public.emails where id = ${res.data.id}::uuid`;
    expect(e).toMatchObject({
      subject: "Welcome to Examplebank",
      preheader: "Your made-up account is ready. Two quick steps left.",
      source: "paste",
      added_by: a.id,
    });
    expect((e!.parts as { ctas: { text: string }[] }).ctas[0]!.text).toBe("Verify my identity");
    const [n] =
      await db`select type, stage, title, provenance, data from public.nodes where id = ${e!.node_id}::uuid`;
    expect(n).toMatchObject({
      type: "email",
      stage: "intake",
      title: "Welcome to Examplebank",
      provenance: "human",
    });
    expect(n!.data).toMatchObject({ emailId: res.data.id, buttons: 1, hasPreheader: true });
  });

  it(".eml file: subject and HTML come from the file", async () => {
    const uploadId = await upload(a, projectId, "sale.eml", eml);
    const res = await addEmail(a.client, { source: "eml", projectId, uploadId });
    if (!res.ok) throw new Error(res.code);
    const [e] =
      await db`select subject, upload_id from public.emails where id = ${res.data.id}::uuid`;
    expect(e).toEqual({ subject: "Don't miss out on 20% off", upload_id: uploadId });
  });

  it(".html file: needs a subject line; with one it's stored", async () => {
    const uploadId = await upload(a, projectId, "offer.html", html);
    expect(await addEmail(a.client, { source: "html", projectId, uploadId })).toEqual({
      ok: false,
      code: "validation",
    });
    const res = await addEmail(a.client, {
      source: "html",
      projectId,
      uploadId,
      subject: "Your offer",
    });
    expect(res.ok).toBe(true);
  });

  it("a file of the wrong kind, or from another project, is refused", async () => {
    const wrong = await upload(a, projectId, "notes.txt", "hello");
    expect(await addEmail(a.client, { source: "eml", projectId, uploadId: wrong })).toEqual({
      ok: false,
      code: "validation",
    });
    const other = await project();
    const elsewhere = await upload(a, other, "x.eml", eml);
    expect(await addEmail(a.client, { source: "eml", projectId, uploadId: elsewhere })).toEqual({
      ok: false,
      code: "not_found",
    });
  });

  it("subject and HTML are required and limited", async () => {
    const pid = await project();
    expect(
      await addEmail(a.client, { source: "paste", projectId: pid, subject: " ", html }),
    ).toEqual({ ok: false, code: "validation" });
    expect(
      await addEmail(a.client, { source: "paste", projectId: pid, subject: "S", html: "" }),
    ).toEqual({ ok: false, code: "validation" });
    expect(
      await addEmail(a.client, {
        source: "paste",
        projectId: pid,
        subject: "S",
        html: "x".repeat(1_000_001),
      }),
    ).toEqual({ ok: false, code: "validation" });
  });

  it("at most 20 emails per project", async () => {
    const pid = await project();
    for (let i = 0; i < 20; i += 1) {
      const r = await addEmail(a.client, {
        source: "paste",
        projectId: pid,
        subject: `E${i}`,
        html: "<p>Hi</p>",
      });
      if (!r.ok) throw new Error(`${i}: ${r.code}`);
    }
    expect(
      await addEmail(a.client, {
        source: "paste",
        projectId: pid,
        subject: "E21",
        html: "<p>Hi</p>",
      }),
    ).toEqual({
      ok: false,
      code: "too_many",
    });
  });

  it("two-user: another workspace sees none, can't add, can't remove", async () => {
    const mine = await listEmails(a.client, projectId);
    expect(mine.length).toBeGreaterThan(0);
    expect(await listEmails(b.client, projectId)).toEqual([]);
    expect(await emailForNode(b.client, mine[0]!.nodeId!)).toBeNull();
    expect(
      await addEmail(b.client, { source: "paste", projectId, subject: "Sneaky", html: "<p>x</p>" }),
    ).toEqual({ ok: false, code: "not_found" });
    expect(await removeEmail(b.client, mine[0]!.id)).toEqual({ ok: false, code: "not_found" });
    // Direct writes are refused too.
    const direct = await b.client.from("emails").insert({
      workspace_id: a.workspaceId,
      project_id: projectId,
      source: "paste",
      subject: "x",
      html: "x",
      added_by: b.id,
    });
    expect(direct.error).not.toBeNull();
  });

  it("remove: the email and its card go", async () => {
    const pid = await project();
    const res = await addEmail(a.client, {
      source: "paste",
      projectId: pid,
      subject: "Remove me",
      html: "<p>Hi</p>",
    });
    if (!res.ok) throw new Error(res.code);
    const rows = (await db`select node_id from public.emails where id = ${res.data.id}::uuid`) as {
      node_id: string;
    }[];
    const node_id = rows[0]!.node_id;
    expect(await removeEmail(a.client, res.data.id)).toEqual({ ok: true, data: undefined });
    expect(await db`select id from public.emails where id = ${res.data.id}::uuid`).toHaveLength(0);
    const [n] = await db`select deleted_at from public.nodes where id = ${node_id}::uuid`;
    expect(n!.deleted_at).not.toBeNull();
  });

  it("a late email marks the themes and what's built from them out of date (AC31.9)", async () => {
    const ctx = await researchedProject();
    const themes = await ctx.nodes("theme");
    expect(themes.length).toBeGreaterThan(0);
    expect(themes.every((t) => !t.stale)).toBe(true);
    const res = await addEmail(ctx.admin.client, {
      source: "paste",
      projectId: ctx.projectId,
      subject: "A late one",
      html: "<h1>Late</h1><p>Added after research.</p>",
    });
    expect(res.ok).toBe(true);
    const after = await ctx.nodes("theme");
    expect(after.every((t) => t.stale)).toBe(true);
    // The research cards themselves (findings, evidence) are untouched.
    const findings = await ctx.nodes("finding");
    expect(findings.every((f) => !f.stale)).toBe(true);
  });
});
