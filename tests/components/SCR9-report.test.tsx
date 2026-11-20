import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "@/app/(app)/projects/[id]/report/loading";
import { CitationCheck, ReportNotYet, ReportView } from "@/components/report/ReportView";
import type { Report } from "@/lib/report/model";

const report = (over: Partial<Report> = {}): Report => ({
  ready: true,
  project: { id: "p1", name: "ID check drop-off" },
  toolkitVersion: 3,
  hasStale: false,
  summary: {
    sources: 9,
    kinds: 4,
    findings: 4,
    themes: 2,
    opportunities: 2,
    byConfidence: { High: 1, Med: 0, Low: 1 },
    gaps: 2,
  },
  objectives: [
    {
      id: "o1",
      label: "Business objective",
      text: "Raise ID checks by 15%",
      lowSpecificity: false,
    },
    {
      id: "o2",
      label: "Behavioural objective",
      text: "Finish the photo step",
      lowSpecificity: true,
    },
  ],
  sourceGroups: [
    { type: "paper", count: 4 },
    { type: "social", count: 3 },
  ],
  themes: [
    {
      id: "t1",
      title: "The ID step takes too much effort",
      summary: "People give up at the photo step.",
      strength: "High",
      reason: "high_multi_type",
      stale: false,
      findings: [
        {
          id: "f1",
          text: "Every extra step loses people.",
          citations: [1, 2],
          aiInference: false,
          qualitative: 0,
        },
        {
          id: "f2",
          text: "The check feels like a test.",
          citations: [],
          aiInference: true,
          qualitative: 0,
        },
      ],
    },
  ],
  opportunities: [
    {
      id: "op1",
      title: "Make the ID step feel shorter",
      summary: "Cut and chunk the photo step.",
      confidence: "Low",
      reason: "low_single",
      principles: ["P001"],
      themes: ["The ID step takes too much effort"],
      citations: [1, 2],
      stale: false,
    },
  ],
  gaps: {
    total: 2,
    discovery: [
      {
        id: "g1",
        question: "How many retry?",
        method: "Desk research",
        kind: "discovery",
        opportunity: "Make the ID step feel shorter",
      },
    ],
    generative: [
      {
        id: "g2",
        question: "Why do people worry?",
        method: "Behavioural interviews",
        kind: "generative",
        opportunity: "Make the ID step feel shorter",
      },
    ],
    methods: ["Desk research", "Behavioural interviews"],
  },
  ethics: { status: "ok", reasons: [], overrides: [] },
  citations: [
    {
      n: 1,
      id: "s1",
      handle: "S1",
      type: "paper",
      title: "The goal-gradient hypothesis",
      url: "https://doi.org/x",
      authors: ["Kivetz"],
      year: 2006,
      doi: "10.1/x",
      retrievedAt: "2026-11-17T10:00:00Z",
    },
    {
      n: 2,
      id: "s2",
      handle: "S2",
      type: "upload",
      title: "funnel.csv",
      url: null,
      authors: [],
      year: null,
      doi: null,
      retrievedAt: "2026-11-17T10:00:00Z",
    },
  ],
  ...over,
});

const view = (r: Report) =>
  render(
    <ReportView
      report={r}
      canvasHref="/projects/p1"
      citationsHref="/projects/p1/report?view=citations"
    />,
  );

describe("SCR9 Audit Report", () => {
  it("loading: skeleton paragraphs", () => {
    const { container } = render(<Loading />);
    expect(container.querySelector("[aria-busy=true]")).toBeTruthy();
  });

  it("not yet: says when it appears, links back to the canvas", () => {
    render(<ReportNotYet canvasHref="/projects/p1" />);
    expect(screen.getByText("The Audit Report appears once research finishes.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to canvas" }).getAttribute("href")).toBe(
      "/projects/p1",
    );
  });

  it("default: sections, citation markers linking to references, AI independent inference, tags", () => {
    view(report());
    for (const h of [
      "Summary",
      "Objectives",
      "Sources",
      "Themes",
      "Opportunities",
      "Evidence gaps",
      "Ethics check",
      "References",
    ])
      expect(screen.getByRole("heading", { name: h })).toBeTruthy();
    expect(
      screen.getByText(
        "9 sources across 4 kinds gave 4 findings, 2 themes and 2 opportunities: 1 high, 0 medium and 1 low confidence.",
      ),
    ).toBeTruthy();
    const marker = screen.getAllByRole("link", { name: "Source 1" })[0]!;
    expect(marker.getAttribute("href")).toBe("#ref-1");
    expect(document.getElementById("ref-1")!.textContent).toContain("The goal-gradient hypothesis");
    expect(screen.getByText("AI independent inference")).toBeTruthy();
    expect(screen.getByText("High strength")).toBeTruthy();
    expect(screen.getByText("Low confidence")).toBeTruthy();
    expect(screen.getByText("Low specificity")).toBeTruthy();
    expect(screen.getByText("Toolkit version 3", { exact: false })).toBeTruthy();
    expect(screen.getByText("Passed. No ethics rules broken.")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("gaps summary counts by kind (AC13.5)", () => {
    view(report());
    expect(
      screen.getByText("2 open questions: 1 for discovery research, 1 for generative research."),
    ).toBeTruthy();
    const gaps = screen.getByRole("region", { name: "Evidence gaps" });
    expect(within(gaps).getByRole("heading", { name: /^Discovery/ })).toBeTruthy();
    expect(within(gaps).getByRole("heading", { name: /^Generative/ })).toBeTruthy();
    expect(
      within(gaps).getByText("Behavioural interviews · Affects: Make the ID step feel shorter"),
    ).toBeTruthy();
  });

  it("no gaps: says so", () => {
    view(report({ gaps: { total: 0, discovery: [], generative: [], methods: [] } }));
    expect(
      screen.getByText("No evidence gaps. Every opportunity has agreeing sources."),
    ).toBeTruthy();
  });

  it("stale content: banner with a way to the canvas", () => {
    view(report({ hasStale: true }));
    const banner = screen.getByRole("status");
    expect(banner.textContent).toContain("Some parts of this report are out of date.");
    expect(within(banner).getByRole("link", { name: "Go to canvas" })).toBeTruthy();
  });

  it("flagged ethics with an override shows the reason and who decided", () => {
    view(
      report({
        ethics: {
          status: "overridden",
          reasons: [
            { rule: "Fake urgency or scarcity", reason: "The brief mentions a countdown." },
          ],
          overrides: [
            {
              rule: "Fake urgency or scarcity",
              reason: "The deadline is real.",
              by: "Ada",
              at: "2026-11-17T10:00:00Z",
            },
          ],
        },
      }),
    );
    expect(screen.getByText("Overridden by Ada, 17 Nov 2026: The deadline is real.")).toBeTruthy();
  });

  it("citation check: every citation with its record and link (AC12.8)", () => {
    render(<CitationCheck report={report()} backHref="/projects/p1/report" />);
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(
      within(rows[1]!)
        .getByRole("link", { name: "The goal-gradient hypothesis" })
        .getAttribute("href"),
    ).toBe("https://doi.org/x");
    expect(within(rows[1]!).getByText("Kivetz · 2006 · DOI 10.1/x")).toBeTruthy();
    expect(within(rows[2]!).getByText("Uploaded file")).toBeTruthy();
  });
});
