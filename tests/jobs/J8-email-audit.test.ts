import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { adminClient, createIsolatedAdmin, createIsolatedUser } from "../helpers/supabase";
import { AiError, type AiCall, type UsageRow } from "@/lib/ai/client";
import { fakeEmailAudit, FakeAiClient, defaultResponders } from "@/lib/ai/fake";
import { emailText, quoteFound } from "@/lib/audit/quoteCheck";
import { addEmail } from "@/lib/email/service";
import { MAX_EXTRA_PRINCIPLES, runEmailAudit } from "@/lib/jobs/emailAudit";
import { createProject } from "@/lib/projects/service";
import { saveToolkitVersion } from "@/lib/toolkit/service";

// J8 emailAudit (AC31.6–AC31.8, 04 D39, D46): each email audited alone against ~20 principles,
// with every quote checked by code, strength set by code, and outside-toolkit problems kept apart.
const html = readFileSync("fixtures/emails/welcome.html", "utf8");
const db = adminClient() as never;
const usage: UsageRow[] = [];
const log = async (r: UsageRow) => void usage.push(r);
const fake = new FakeAiClient(log);
const withResponder = (fn: (call: AiCall<unknown>) => unknown) =>
  new FakeAiClient(log, { ...defaultResponders, email_audit: fn });

describe("J8 email audit", () => {
  let admin: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  let projectId: string;
  let keys: string[];
  const nextEmail = async (subject = "Welcome to Examplebank") => {
    const res = await addEmail(admin.client, { source: "paste", projectId, subject, html });
    if (!res.ok) throw new Error(res.code);
    return res.data.id;
  };
  const findings = async (emailId: string) =>
    (
      await adminClient()
        .from("email_findings")
        .select("*")
        .eq("email_id", emailId)
        .order("position")
    ).data ?? [];
  const audit = async (emailId: string) =>
    (await adminClient().from("email_audits").select("*").eq("email_id", emailId).single()).data!;

  beforeAll(async () => {
    admin = await createIsolatedAdmin();
    const saved = await saveToolkitVersion(admin.client, {
      fileName: "t.csv",
      content: readFileSync("fixtures/toolkit/sample-toolkit.csv", "utf8"),
    });
    if (!saved.ok) throw new Error(saved.code);
    const p = await createProject(admin.client, {
      name: "Audit",
      mode: "optimise",
      channel: "email",
    });
    if (!p.ok) throw new Error(p.code);
    projectId = p.data.id;
    await admin.client
      .from("intakes")
      .update({
        business_objective: "Raise completed ID checks by 15% within 3 months",
        behavioural_objective: "New customers upload their ID within their first day",
        audience_context: "First-time banking app customers",
        sector: "Banking",
      })
      .eq("project_id", projectId);
    keys = (
      await adminClient()
        .from("principles")
        .select("principle_key")
        .eq("workspace_id", admin.workspaceId)
    ).data!.map((r) => r.principle_key);
  });

  it("every quote appears in the email, and every toolkit finding has a principle and a strength", async () => {
    const emailId = await nextEmail();
    const res = await runEmailAudit(db, fake, { emailId, startedBy: admin.id });
    expect(res.status).toBe("done");
    const rows = await findings(emailId);
    expect(rows.length).toBeGreaterThan(2);
    const text = emailText({ subject: "Welcome to Examplebank", preheader: null, html });
    for (const r of rows.filter((r) => r.proof_kind === "quote"))
      expect(quoteFound(r.proof_text, text)).toBe(true);
    for (const r of rows.filter((r) => !r.outside_toolkit)) {
      expect(keys).toContain(r.principle_key);
      expect(["High", "Med", "Low"]).toContain(r.strength);
      expect(["friction", "working"]).toContain(r.verdict);
      expect(["structure", "content", "visual"]).toContain(r.lens);
    }
    expect((await audit(emailId)).status).toBe("done");
    expect(usage.at(-1)).toMatchObject({ step: "email_audit", success: true });
  });

  it("shortlist is about 20 and the audit lists the principles it used", async () => {
    expect(keys.length).toBeGreaterThan(20);
    const emailId = await nextEmail();
    await runEmailAudit(db, fake, { emailId });
    const list = (await audit(emailId)).shortlist as {
      key: string;
      name: string;
      extra: boolean;
    }[];
    expect(list.filter((p) => !p.extra)).toHaveLength(20);
    expect(list.every((p) => keys.includes(p.key))).toBe(true);
  });

  it("an invented quote is dropped and logged; real ones stay", async () => {
    const emailId = await nextEmail();
    const ai = withResponder((call) => {
      const good = fakeEmailAudit({
        subject: "Welcome to Examplebank",
        ctas: ["Verify my identity"],
        bodyWords: "",
        shortlist: call.input!.shortlist as string[],
        hasImage: false,
      });
      return {
        findings: [
          ...good.findings,
          {
            part: "body",
            lens: "content",
            verdict: "friction",
            principleKey: (call.input!.shortlist as string[])[0],
            proof: { kind: "quote", text: "Claim your free gift before midnight" },
            explanation: "Made up.",
          },
        ],
      };
    });
    const res = await runEmailAudit(db, ai, { emailId });
    expect(res).toMatchObject({ status: "done", dropped: 1 });
    const rows = await findings(emailId);
    expect(rows.some((r) => r.proof_text.includes("free gift"))).toBe(false);
    expect(rows.some((r) => r.proof_text === "Verify my identity")).toBe(true);
    expect((await audit(emailId)).dropped).toEqual([
      expect.objectContaining({
        reason: "quote_rejected",
        text: "Claim your free gift before midnight",
      }),
    ]);
  });

  it("unknown principles and too many extras are dropped; a few extras are marked", async () => {
    const emailId = await nextEmail();
    const ai = withResponder((call) => {
      const onList = new Set(call.input!.shortlist as string[]);
      const off = keys.filter((k) => !onList.has(k));
      const f = (key: string | null) => ({
        part: "subject" as const,
        lens: "content" as const,
        verdict: "working" as const,
        principleKey: key,
        proof: { kind: "quote" as const, text: "Welcome to Examplebank" },
        explanation: "x",
      });
      return { findings: [f("NOPE-123"), ...off.slice(0, MAX_EXTRA_PRINCIPLES + 2).map(f)] };
    });
    await runEmailAudit(db, ai, { emailId });
    const rows = await findings(emailId);
    expect(rows).toHaveLength(MAX_EXTRA_PRINCIPLES);
    expect(rows.every((r) => r.extra)).toBe(true);
    const reasons = ((await audit(emailId)).dropped as { reason: string }[])
      .map((d) => d.reason)
      .sort();
    expect(reasons).toEqual(["too_many_extras", "too_many_extras", "unknown_principle"]);
    const list = (await audit(emailId)).shortlist as { extra: boolean }[];
    expect(list.filter((p) => p.extra)).toHaveLength(MAX_EXTRA_PRINCIPLES);
  });

  it("findings outside the toolkit are separate: no principle, no strength, listed last", async () => {
    const emailId = await nextEmail();
    await runEmailAudit(db, fake, { emailId });
    const rows = await findings(emailId);
    const outside = rows.filter((r) => r.outside_toolkit);
    expect(outside.length).toBeGreaterThan(0);
    for (const r of outside) {
      expect(r.principle_key).toBeNull();
      expect(r.strength).toBeNull();
    }
    const firstOutside = rows.findIndex((r) => r.outside_toolkit);
    expect(rows.slice(firstOutside).every((r) => r.outside_toolkit)).toBe(true);
  });

  it("a picture-based finding is dropped when there is no picture", async () => {
    const emailId = await nextEmail();
    const ai = withResponder((call) => ({
      findings: [
        {
          part: "hero",
          lens: "visual",
          verdict: "working",
          principleKey: (call.input!.shortlist as string[])[0],
          proof: { kind: "image", text: "the hero image" },
          explanation: "x",
        },
      ],
    }));
    await runEmailAudit(db, ai, { emailId });
    expect(await findings(emailId)).toHaveLength(0);
    expect(((await audit(emailId)).dropped as { reason: string }[])[0]!.reason).toBe(
      "image_not_available",
    );
    expect((await audit(emailId)).used_image).toBe(false);
  });

  it("measured facts from a render become 'measured' findings outside the toolkit", async () => {
    const emailId = await nextEmail();
    const measured = {
      imagesOn: false,
      layoutWidth: 375,
      responsive: true,
      zoom: 1,
      fullHeight: 1200,
      foldPx: 580,
      links: [],
      textContrast: { samples: 4, failing: 1, lowest: { snippet: "Fine print", ratio: 2.1 } },
      colours: { text: [], background: [] },
      images: { count: 0, withoutAlt: 0 },
      preheader: { present: true, length: 20 },
      words: 50,
    };
    await adminClient().from("email_renders").insert({
      workspace_id: admin.workspaceId,
      project_id: projectId,
      email_id: emailId,
      images: false,
      storage_path: "none/none.png",
      width: 375,
      height: 1200,
      measured,
    });
    await runEmailAudit(db, fake, { emailId });
    const m = (await findings(emailId)).filter((r) => r.proof_kind === "measured");
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ outside_toolkit: true, lens: "visual", verdict: "friction" });
    expect(m[0]!.proof_text).toContain("Fine print");
    expect((await audit(emailId)).used_measured).toBe(true);
  });

  it("running it again replaces the findings; there is one audit per email", async () => {
    const emailId = await nextEmail();
    await runEmailAudit(db, fake, { emailId });
    const first = (await findings(emailId)).length;
    await runEmailAudit(db, fake, { emailId });
    expect(await findings(emailId)).toHaveLength(first);
    const audits = await adminClient().from("email_audits").select("id").eq("email_id", emailId);
    expect(audits.data).toHaveLength(1);
  });

  it("an AI failure marks the audit failed, with no findings and no half answer", async () => {
    const emailId = await nextEmail();
    const ai = withResponder(() => {
      throw new AiError("unavailable");
    });
    const res = await runEmailAudit(db, ai, { emailId });
    expect(res.status).toBe("failed");
    expect(await findings(emailId)).toHaveLength(0);
    expect(await audit(emailId)).toMatchObject({ status: "failed", error_code: "unavailable" });
  });

  it("with no toolkit loaded it fails clearly", async () => {
    const other = await createIsolatedUser();
    const p = await createProject(other.client, {
      name: "NoToolkit",
      mode: "optimise",
      channel: "email",
    });
    if (!p.ok) throw new Error(p.code);
    const e = await addEmail(other.client, {
      source: "paste",
      projectId: p.data.id,
      subject: "Hi",
      html,
    });
    if (!e.ok) throw new Error(e.code);
    const res = await runEmailAudit(db, fake, { emailId: e.data.id });
    expect(res.status).toBe("failed");
    expect(await audit(e.data.id)).toMatchObject({ status: "failed", error_code: "no_toolkit" });
  });
});
