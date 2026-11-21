import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, createIsolatedUser, sql } from "../helpers/supabase";

// email_audits and email_findings (AC31.6–AC31.8, 04 D46): members of the workspace read; only the
// audit job (service role) writes; other workspaces and signed-out visitors see and touch nothing.
const db = sql();
afterAll(() => db.end());

describe("RLS email_audits and email_findings", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let b: Awaited<ReturnType<typeof createIsolatedUser>>;
  let projectId: string;
  let emailId: string;
  let auditId: string;
  let findingId: string;

  beforeAll(async () => {
    a = await createIsolatedUser();
    b = await createIsolatedUser();
    const p = await a.client
      .from("projects")
      .insert({
        workspace_id: a.workspaceId,
        name: "Audit RLS",
        mode: "optimise",
        channel: "email",
        created_by: a.id,
        updated_by: a.id,
      })
      .select("id")
      .single();
    projectId = p.data!.id;
    const [e] =
      await db`insert into public.emails (workspace_id, project_id, source, subject, html, added_by)
      values (${a.workspaceId}::uuid, ${projectId}::uuid, 'paste', 'Hello', '<p>Hi</p>', ${a.id}::uuid) returning id`;
    emailId = e!.id as string;
    const [au] =
      await db`insert into public.email_audits (workspace_id, project_id, email_id, status)
      values (${a.workspaceId}::uuid, ${projectId}::uuid, ${emailId}::uuid, 'done') returning id`;
    auditId = au!.id as string;
    const [f] =
      await db`insert into public.email_findings (workspace_id, project_id, email_id, audit_id, part, lens, verdict, proof_kind, proof_text, explanation)
      values (${a.workspaceId}::uuid, ${projectId}::uuid, ${emailId}::uuid, ${auditId}::uuid, 'subject', 'content', 'friction', 'quote', 'Hello', 'x') returning id`;
    findingId = f!.id as string;
  });

  it("members read their workspace's audits and findings; others and signed-out visitors don't", async () => {
    expect((await a.client.from("email_audits").select("id").eq("email_id", emailId)).data).toEqual(
      [{ id: auditId }],
    );
    expect(
      (await a.client.from("email_findings").select("id").eq("email_id", emailId)).data,
    ).toEqual([{ id: findingId }]);
    for (const t of ["email_audits", "email_findings"] as const) {
      expect((await b.client.from(t).select("id").eq("email_id", emailId)).data ?? []).toHaveLength(
        0,
      );
      expect((await anonClient().from(t).select("id")).data ?? []).toHaveLength(0);
    }
  });

  it("nobody can write through the app: not members, not other workspaces", async () => {
    const audit = {
      workspace_id: a.workspaceId,
      project_id: projectId,
      email_id: emailId,
      depth: "full",
    };
    const finding = {
      workspace_id: a.workspaceId,
      project_id: projectId,
      email_id: emailId,
      audit_id: auditId,
      part: "body",
      lens: "content",
      verdict: "working",
      proof_kind: "quote",
      proof_text: "Hi",
      explanation: "x",
    };
    for (const who of [a, b]) {
      expect((await who.client.from("email_audits").insert(audit)).error).not.toBeNull();
      expect((await who.client.from("email_findings").insert(finding)).error).not.toBeNull();
    }
    expect(
      (
        await a.client
          .from("email_findings")
          .update({ explanation: "changed" })
          .eq("id", findingId)
          .select("id")
      ).data ?? [],
    ).toHaveLength(0);
    expect(
      (
        await a.client
          .from("email_audits")
          .update({ status: "failed" })
          .eq("id", auditId)
          .select("id")
      ).data ?? [],
    ).toHaveLength(0);
    expect(
      (await a.client.from("email_findings").delete().eq("id", findingId).select("id")).data ?? [],
    ).toHaveLength(0);
    expect(
      (await a.client.from("email_audits").delete().eq("id", auditId).select("id")).data ?? [],
    ).toHaveLength(0);
  });

  it("values outside the rules are refused by the database", async () => {
    await expect(
      db`insert into public.email_findings (workspace_id, project_id, email_id, audit_id, part, lens, verdict, proof_kind, proof_text, explanation)
         values (${a.workspaceId}::uuid, ${projectId}::uuid, ${emailId}::uuid, ${auditId}::uuid, 'sidebar', 'content', 'friction', 'quote', 'x', 'x')`,
    ).rejects.toThrow();
    await expect(
      db`insert into public.email_findings (workspace_id, project_id, email_id, audit_id, part, lens, verdict, proof_kind, proof_text, explanation)
         values (${a.workspaceId}::uuid, ${projectId}::uuid, ${emailId}::uuid, ${auditId}::uuid, 'body', 'content', 'friction', 'guess', 'x', 'x')`,
    ).rejects.toThrow();
    await expect(
      db`insert into public.email_audits (workspace_id, project_id, email_id, depth) values (${a.workspaceId}::uuid, ${projectId}::uuid, ${emailId}::uuid, 'full')`,
    ).resolves.toBeDefined();
    await expect(
      db`insert into public.email_audits (workspace_id, project_id, email_id, depth) values (${a.workspaceId}::uuid, ${projectId}::uuid, ${emailId}::uuid, 'full')`,
    ).rejects.toThrow();
  });

  it("removing the email removes its audit and findings", async () => {
    await db`delete from public.emails where id = ${emailId}::uuid`;
    expect(
      await db`select id from public.email_audits where email_id = ${emailId}::uuid`,
    ).toHaveLength(0);
    expect(
      await db`select id from public.email_findings where email_id = ${emailId}::uuid`,
    ).toHaveLength(0);
  });
});
