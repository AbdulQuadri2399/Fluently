// Toolkit copy (SCR11), quoted from specs/fluently-mvp/03-ux-flows.md section 7.
export const toolkitCopy = {
  title: "Toolkit",
  noneYet:
    "Upload the Behavioural Design Toolkit before running research. Fluently cites every principle from it.",
  noneYetMember: "Research is waiting for the toolkit. Ask your Fluently admin to upload it.",
  emptyAdmin:
    "No toolkit yet. Upload a CSV or JSON export of the Behavioural Design Toolkit. Each upload becomes a read-only version.",
  errorMissingId: (row: number) =>
    `Row ${row}: the ID is empty. Every principle needs a stable ID.`,
  errorDuplicateId: (rows: number[], id: string) =>
    `Rows ${rows.join(", ")}: the ID "${id}" is used more than once. IDs must be unique.`,
  errorMissingColumns: (columns: string[]) =>
    `This file is missing required columns: ${columns.join(", ")}.`,
  errorFile: "Use a CSV or JSON file up to 10 MB.",
  errorUnreadable: "Couldn't read this file. Check it's a CSV or JSON export of the toolkit.",
  errorEmpty: "This file has no principles in it.",
  warnUnknownColumns: (columns: string[]) =>
    `Fluently doesn't use these columns, so they were left out: ${columns.join(", ")}.`,
  warnRelatedNotFound: (row: number, text: string) =>
    `Row ${row}: the related principle "${text}" isn't in this file, so no connection was made. The text is kept.`,
  warnGeneratedIds:
    "This file has no ID column, so Fluently gave each principle an ID in the order of the sheet. Later uploads keep the same ID for a principle with the same name.",
  warnNoName: (row: number) => `Row ${row}: no principle name, so this row was left out.`,
  warnMergedSameName: (name: string, rows: number[]) =>
    `"${name}" appears on rows ${rows.join(", ")}. They were combined into one principle.`,
  warnGoalsUnified: (variants: string[], used: string) =>
    `These goal spellings were treated as one: ${variants.map((v) => `"${v}"`).join(", ")}. Fluently uses "${used}".`,
  warnThinRows: (count: number, names: string[]) =>
    `${count} ${count === 1 ? "principle has" : "principles have"} no summary, explanation or example (for example ${names.join(", ")}). They're kept, and used less when Fluently picks principles to audit with.`,
  saved: (n: number) => `Toolkit version ${n} saved. New projects will use it.`,
  upload: "Upload toolkit",
  uploadNew: "Upload new version",
  checking: "Checking your file…",
  saveAs: (n: number) => `Save as version ${n}`,
  savingAs: (n: number) => `Saving version ${n}…`,
  chooseAnother: "Choose another file",
  cancel: "Cancel",
  previewTitle: (file: string) => `Checking ${file}`,
  rowCount: (n: number) => `${n} rows`,
  principleCount: (n: number) => `${n} principles`,
  errorsTitle: "Fix these problems and upload the file again. Nothing has been saved.",
  warningsTitle: "Warnings",
  versions: "Versions",
  candidates: "Toolkit candidates",
  candidatesEmpty:
    "No candidates yet. When research finds a principle that isn't in the toolkit, it's listed here for review.",
  colVersion: "Version",
  colFile: "File",
  colUploaded: "Uploaded",
  colPrinciples: "Principles",
  colEvidence: "Evidence",
  defaultChip: "Default",
  evidenceCounts: (strong: number, some: number, none: number) =>
    `${strong} strong · ${some} some · ${none} none`,
  versionLabel: (n: number) => `Version ${n}`,
  pinned: (n: number) => `Toolkit v${n}`,
  newer: (n: number) => `newer v${n} available`,
  saveFailed: "Couldn't save. Check your connection and try again.",
} as const;
