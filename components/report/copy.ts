// Audit Report copy (SCR9), quoted from specs/fluently-mvp/03-ux-flows.md section 7.
export const reportCopy = {
  title: "Audit Report",
  notYet: "The Audit Report appears once research finishes.",
  hasStale: "Some parts of this report are out of date. Update them on the canvas.",
  goToCanvas: "Go to canvas",
  sections: {
    summary: "Summary",
    objectives: "Objectives",
    sources: "Sources",
    themes: "Themes",
    opportunities: "Opportunities",
    gaps: "Evidence gaps",
    ethics: "Ethics check",
    references: "References",
  },
  summaryText: (s: {
    sources: number;
    kinds: number;
    findings: number;
    themes: number;
    opportunities: number;
    high: number;
    med: number;
    low: number;
  }) =>
    `${s.sources} sources across ${s.kinds} kinds gave ${s.findings} findings, ${s.themes} themes and ${s.opportunities} opportunities: ${s.high} high, ${s.med} medium and ${s.low} low confidence.`,
  toolkit: (n: number) => `Toolkit version ${n}`,
  builtFrom: "Built from",
  principles: "Candidate principles",
  affects: (opportunity: string) => `Affects: ${opportunity}`,
  gapsSummary: (n: number, d: number, g: number) =>
    `${n} open ${n === 1 ? "question" : "questions"}: ${d} for discovery research, ${g} for generative research.`,
  gapsNone: "No evidence gaps. Every opportunity has agreeing sources.",
  gapKind: { discovery: "Discovery", generative: "Generative" },
  gapKindHint: {
    discovery: "Confirm or measure what we think is happening.",
    generative: "Explore needs and reasons we don't yet understand.",
  },
  ethicsPassed: "Passed. No ethics rules broken.",
  ethicsFlagged: "Flagged",
  ethicsNotRun: "The ethics check didn't run.",
  override: (name: string, date: string, reason: string) =>
    `Overridden by ${name}, ${date}: ${reason}`,
  citationCheck: "Citation check",
  citationCheckHint:
    "Every citation in this report with its stored record. Open any 20 to check them.",
  citationCols: {
    n: "#",
    source: "Source",
    kind: "Kind",
    details: "Details",
    retrieved: "Retrieved",
  },
  openLink: "Open",
  uploadedFile: "Uploaded file",
  backToReport: "Back to report",
  aiInference: "AI independent inference",
  qualitative: (n: number) => `Qualitative signal · ${n} ${n === 1 ? "source" : "sources"}`,
  lowSpecificity: "Low specificity",
  outOfDate: "Out of date",
  download: "Download",
  downloadMarkdown: "Markdown (.md)",
  downloadPdf: "PDF",
  exporting: "Preparing your file…",
  exportFailed: "Export didn't work. Try again.",
  retry: "Try again",
  sourceKinds: {
    upload: "Client data",
    paper: "Academic papers",
    desk: "Web and market",
    competitor: "Competitors",
    social: "Reviews and forums",
    toolkit: "Toolkit principles",
  } as Record<string, string>,
  confidenceReason: {
    high_multi_type: "Three or more sources of at least two kinds agree.",
    med_two_agree: "Two or more sources agree.",
    med_three_one_type: "Three or more sources, all of one kind.",
    low_single: "Only one source.",
    low_ai_only: "Only AI independent inference, no stored source.",
    low_contradict: "The sources disagree.",
  } as Record<string, string>,
} as const;
