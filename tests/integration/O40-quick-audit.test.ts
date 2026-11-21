import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { adminClient, createIsolatedAdmin, createIsolatedUser } from "../helpers/supabase";
import { FakeAiClient } from "@/lib/ai/fake";
import { getEmailAudit, startQuickAudit } from "@/lib/audit/service";
import { addEmail } from "@/lib/email/service";
import { runEmailAudit } from "@/lib/jobs/emailAudit";
import { createProject } from "@/lib/projects/service";
import { saveToolkitVersion } from "@/lib/toolkit/service";

// O40 startQuickAudit / getEmailAudit (AC31.6, AC31.9): start, show running at once, read back.
const html = readFileSync("fixtures/emails/welcome.html", "utf8");

describe("O40 quick audit service", () => {
  let a: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  let b: Awaited<ReturnType<typeof createIsolatedUser>>;
  let emailId: string;

  beforeAll(async () => {
    a = await createIsolatedAdmin();
    b = await createIsolatedUser();
    const saved = await saveToolkitVersion(a.client, {
      fileName: "t.csv",
      content: readFileSync("fixtures/toolkit/sample-toolkit.csv", "utf8"),
    });
    if (!saved.ok) throw new Error(saved.code);
    const p = await createProject(a.client, { name: "Quick", mode: "optimise", channel: "email" });
    if (!p.ok) throw new Error(p.code);
    const e = await addEmail(a.client, {
      source: "paste",
      projectId: p.data.id,
      subject: "Welcome",
      html,
    });
    if (!e.ok) throw new Error(e.code);
    emailId = e.data.id;
  });

  it("another workspace can't start or read an audit", async () => {
    const launch = vi.fn();
    expect(await startQuickAudit(b.client, emailId, launch)).toEqual({
      ok: false,
      code: "not_found",
    });
    expect(launch).not.toHaveBeenCalled();
    expect(await getEmailAudit(b.client, emailId)).toBeNull();
  });

  it("starting marks it running straight away and launches the job once, even if clicked twice", async () => {
    const launch = vi.fn();
    expect(await startQuickAudit(a.client, emailId, launch)).toEqual({
      ok: true,
      data: { started: true },
    });
    expect(await getEmailAudit(a.client, emailId)).toMatchObject({
      status: "running",
      findings: [],
    });
    await startQuickAudit(a.client, emailId, launch);
    expect(launch).toHaveBeenCalledTimes(1);
    expect(launch).toHaveBeenCalledWith(emailId, a.id);
  });

  it("after the job runs, the member reads the findings in order, with their proof", async () => {
    await runEmailAudit(adminClient() as never, new FakeAiClient(async () => undefined), {
      emailId,
    });
    const view = await getEmailAudit(a.client, emailId);
    expect(view!.status).toBe("done");
    expect(view!.shortlist.filter((p) => !p.extra)).toHaveLength(20);
    expect(view!.findings.length).toBeGreaterThan(2);
    const f = view!.findings[0]!;
    expect(f).toMatchObject({ proofKind: "quote", outsideToolkit: false });
    expect(f.principleName).toBeTruthy();
    expect(f.strength).toMatch(/High|Med|Low/);
  });

  it("running it again after it finished starts a fresh run", async () => {
    const launch = vi.fn();
    await startQuickAudit(a.client, emailId, launch);
    expect(launch).toHaveBeenCalledTimes(1);
    expect((await getEmailAudit(a.client, emailId))!.status).toBe("running");
  });
});
