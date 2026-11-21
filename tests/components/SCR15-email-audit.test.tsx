import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailAuditSection, type EmailAuditFns } from "@/components/email/EmailAuditSection";
import { emailCopy as c } from "@/components/email/copy";
import { canvasCopy as cc } from "@/components/canvas/copy";
import type { AuditFinding, EmailAuditView } from "@/lib/audit/service";

// The quick audit in the side panel (AC31.6–AC31.8): states, grouping, labels, trust notes.
const finding = (over: Partial<AuditFinding>): AuditFinding => ({
  id: Math.random().toString(36),
  part: "subject",
  lens: "content",
  verdict: "working",
  principleKey: "P001",
  principleName: "Step Shrinking",
  extra: false,
  outsideToolkit: false,
  strength: "High",
  proofKind: "quote",
  proofText: "Welcome to Examplebank",
  explanation: "The subject says what the email is about.",
  ...over,
});
const done = (over: Partial<EmailAuditView> = {}): EmailAuditView => ({
  status: "done",
  errorCode: null,
  shortlist: [
    { key: "P001", name: "Step Shrinking", extra: false },
    { key: "P002", name: "Loss Aversion", extra: true },
  ],
  droppedCount: 0,
  usedImage: true,
  usedMeasured: true,
  finishedAt: new Date().toISOString(),
  findings: [
    finding({}),
    finding({
      part: "ctas",
      verdict: "friction",
      lens: "structure",
      strength: "Low",
      proofText: "Verify my identity",
    }),
    finding({
      part: "hero",
      lens: "visual",
      proofKind: "image",
      proofText: "the hero image",
      principleName: "Salience",
      extra: true,
      strength: "Med",
    }),
    finding({
      part: "body",
      lens: "visual",
      verdict: "friction",
      principleKey: null,
      principleName: null,
      outsideToolkit: true,
      strength: null,
      proofKind: "measured",
      proofText: '"Fine print" at 2.1 to 1',
      explanation: "Text this pale is hard to read.",
    }),
  ],
  ...over,
});
const fns = (view: EmailAuditView | null, extra: Partial<EmailAuditFns> = {}): EmailAuditFns => ({
  load: vi.fn(async () => view),
  start: vi.fn(async () => ({ ok: true as const, data: { started: true as const } })),
  ...extra,
});

describe("quick audit section", () => {
  it("says it hasn't been run yet, and offers to run it", async () => {
    render(<EmailAuditSection emailId="e1" fns={fns(null)} />);
    expect(await screen.findByText(c.audit.notRun)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.audit.run })).toBeInTheDocument();
  });

  it("shows findings grouped by part, with lens, verdict, principle and strength", async () => {
    render(<EmailAuditSection emailId="e1" fns={fns(done())} />);
    expect(await screen.findByText(c.audit.summary(2, 2))).toBeInTheDocument();
    const subject = screen.getByRole("region", { name: c.audit.parts.subject });
    expect(within(subject).getByText(c.audit.working)).toBeInTheDocument();
    expect(within(subject).getByText(c.audit.lens.content)).toBeInTheDocument();
    expect(within(subject).getByText("Step Shrinking")).toBeInTheDocument();
    expect(within(subject).getByText(cc.strengthLabel("High"))).toBeInTheDocument();
    expect(within(subject).getByText("“Welcome to Examplebank”")).toBeInTheDocument();
    const ctas = screen.getByRole("region", { name: c.audit.parts.ctas });
    expect(within(ctas).getByText(c.audit.friction)).toBeInTheDocument();
    expect(within(ctas).getByText(cc.strengthLabel("Low"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.audit.again })).toBeInTheDocument();
  });

  it("labels a picture-based finding 'read from the image' and a measured one 'measured'", async () => {
    render(<EmailAuditSection emailId="e1" fns={fns(done())} />);
    await screen.findByText(c.audit.summary(2, 2));
    const hero = screen.getByRole("region", { name: c.audit.parts.hero });
    expect(within(hero).getByText(new RegExp(c.audit.proofImage))).toBeInTheDocument();
    expect(within(hero).getByText("the hero image")).toBeInTheDocument();
    const outside = screen.getByRole("region", { name: c.audit.outsideTitle });
    expect(within(outside).getByText(new RegExp(c.audit.proofMeasured))).toBeInTheDocument();
  });

  it("keeps problems outside the toolkit apart: no principle, no strength", async () => {
    render(<EmailAuditSection emailId="e1" fns={fns(done())} />);
    await screen.findByText(c.audit.summary(2, 2));
    const outside = screen.getByRole("region", { name: c.audit.outsideTitle });
    expect(within(outside).getByText(c.audit.outsideHelp)).toBeInTheDocument();
    expect(within(outside).getByText("Text this pale is hard to read.")).toBeInTheDocument();
    expect(within(outside).queryByText(/strength/)).not.toBeInTheDocument();
    // and it is not repeated under its part
    expect(screen.queryByRole("region", { name: c.audit.parts.body })).not.toBeInTheDocument();
  });

  it("lists the principles used, and marks any outside the shortlist", async () => {
    render(<EmailAuditSection emailId="e1" fns={fns(done())} />);
    const summary = await screen.findByText(c.audit.usedPrinciples(2));
    await userEvent.click(summary);
    expect(screen.getByText(`Loss Aversion · ${c.audit.extraMarker}`)).toBeInTheDocument();
  });

  it("tells you what was left out, and what the audit couldn't use", async () => {
    render(
      <EmailAuditSection
        emailId="e1"
        fns={fns(done({ droppedCount: 2, usedImage: false, usedMeasured: false }))}
      />,
    );
    expect(await screen.findByText(c.audit.dropped(2))).toBeInTheDocument();
    expect(screen.getByText(c.audit.noImage)).toBeInTheDocument();
    expect(screen.getByText(c.audit.noMeasured)).toBeInTheDocument();
  });

  it("explains a failure, and a missing toolkit in particular", async () => {
    const { unmount } = render(
      <EmailAuditSection
        emailId="e1"
        fns={fns(done({ status: "failed", errorCode: "unavailable", findings: [] }))}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(c.audit.failed);
    unmount();
    render(
      <EmailAuditSection
        emailId="e1"
        fns={fns(done({ status: "failed", errorCode: "no_toolkit", findings: [] }))}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(c.audit.noToolkit);
  });

  it("says so when it can't start", async () => {
    render(
      <EmailAuditSection
        emailId="e1"
        fns={fns(null, {
          start: vi.fn(async () => ({ ok: false as const, code: "unavailable" as const })),
        })}
      />,
    );
    await userEvent.click(await screen.findByRole("button", { name: c.audit.run }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.audit.failed);
  });
});

describe("quick audit section while it runs", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("shows it running, keeps checking, and shows the result when done", async () => {
    const states: (EmailAuditView | null)[] = [
      null,
      done({ status: "running", findings: [] }),
      done({ status: "running", findings: [] }),
      done(),
    ];
    const load = vi.fn(
      async () => states[Math.min(load.mock.calls.length - 1, states.length - 1)]!,
    );
    const f: EmailAuditFns = {
      load,
      start: vi.fn(async () => ({ ok: true as const, data: { started: true as const } })),
    };
    render(<EmailAuditSection emailId="e1" fns={f} />);
    await userEvent.click(await screen.findByRole("button", { name: c.audit.run }));
    expect(f.start).toHaveBeenCalledWith("e1");
    expect(await screen.findByRole("status")).toHaveTextContent(c.audit.running);
    expect(screen.queryByText(c.audit.summary(2, 2))).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4500);
    });
    expect(await screen.findByText(c.audit.summary(2, 2))).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
