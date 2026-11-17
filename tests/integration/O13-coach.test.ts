import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIsolatedUser, sql } from "../helpers/supabase";
import type { UsageRow } from "@/lib/ai/client";
import { FakeAiClient } from "@/lib/ai/fake";
import { coachField, getIntake, resolveSuggestion, saveIntakeField } from "@/lib/intake/service";
import { createProject } from "@/lib/projects/service";

// O12 saveIntakeField, O13 coachField, suggestion actions (AC8.2–AC8.5, AC8.9).
const db = sql();
afterAll(() => db.end());

describe("O12/O13 brief autosave and coaching", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let projectId: string;
  const usage: UsageRow[] = [];
  const ai = new FakeAiClient(async (r) => void usage.push(r));

  beforeAll(async () => {
    a = await createIsolatedUser();
    const p = await createProject(a.client, { name: "Coach me", mode: "new", channel: "screens" });
    if (!p.ok) throw new Error(p.code);
    projectId = p.data.id;
  });

  it("autosave bumps the version; a stale version is a conflict", async () => {
    const first = await saveIntakeField(a.client, {
      projectId,
      field: "audience_context",
      value: "Busy parents",
      version: 1,
    });
    expect(first).toEqual({ ok: true, data: { version: 2 } });
    const stale = await saveIntakeField(a.client, {
      projectId,
      field: "audience_context",
      value: "Old tab",
      version: 1,
    });
    expect(stale).toEqual({ ok: false, code: "conflict" });
    const bad = await saveIntakeField(a.client, {
      projectId,
      field: "figma_link",
      value: "https://example.com",
      version: 2,
    });
    expect(bad).toEqual({ ok: false, code: "validation" });
  });

  it("suggestion + reason returned, and the call is logged", async () => {
    const res = await coachField(
      a.client,
      { projectId, field: "business_objective", text: "Get more people to finish sign-up" },
      { ai },
    );
    if (!res.ok) throw new Error(res.code);
    expect(res.data.suggestion).toMatch(/15%/);
    expect(res.data.reason.length).toBeGreaterThan(10);
    expect(res.data.lowSpecificity).toBe(true);
    expect(usage.at(-1)).toMatchObject({
      stage: "intake",
      step: "coach",
      success: true,
      project_id: projectId,
    });
  });

  it("fake timeout → unavailable", async () => {
    const slow = new FakeAiClient(async () => undefined, {
      coach: () => new Promise(() => undefined),
    });
    const res = await coachField(
      a.client,
      { projectId, field: "constraints", text: "Must use our brand colours" },
      { ai: slow, timeoutMs: 50 },
    );
    expect(res).toEqual({ ok: false, code: "unavailable" });
  });

  it("vague behavioural objective with keep mine sets low_specificity and records the action", async () => {
    const intake = await getIntake(a.client, projectId);
    if (!intake.ok) throw new Error(intake.code);
    const res = await resolveSuggestion(a.client, {
      projectId,
      field: "behavioural_objective",
      action: "keep",
      value: "Upload their ID",
      lowSpecificity: true,
      version: intake.data.version,
    });
    expect(res).toMatchObject({ ok: true, data: { lowSpecificity: true } });
    const after = await getIntake(a.client, projectId);
    expect(after.ok && after.data.low_specificity).toEqual({ behavioural_objective: true });
    expect(after.ok && after.data.behavioural_objective).toBe("Upload their ID");
    const [ev] = await db<{ props: Record<string, unknown> }[]>`
      select props from public.events where member_id = ${a.id} and name = 'intake_suggestion_resolved'`;
    expect(ev?.props).toEqual({
      field: "behavioural_objective",
      action: "keep",
      low_specificity: true,
    });

    // Using the suggestion afterwards clears the flag.
    const use = await resolveSuggestion(a.client, {
      projectId,
      field: "behavioural_objective",
      action: "use",
      value: "New customers upload their ID within their first week.",
      lowSpecificity: true,
      version: after.ok ? after.data.version : 0,
    });
    expect(use).toMatchObject({ ok: true, data: { lowSpecificity: false } });
  });
});
