// Brief copy (SCR6), quoted from specs/fluently-mvp/03-ux-flows.md section 7.
export const intakeCopy = {
  title: "Brief",
  fields: {
    business_objective: {
      label: "Business objective",
      help: "What the client wants to change, with a number. For example: raise completed sign-ups by 15% in 3 months.",
    },
    behavioural_objective: {
      label: "Behavioural objective",
      help: "Who does what, and when. For example: new customers upload their ID within their first day.",
    },
    audience_context: {
      label: "Audience and context",
      help: "Who they are, and the moment they meet this design.",
    },
    constraints: {
      label: "Constraints (optional)",
      help: "Brand, design system, regulation, anything that can't change.",
    },
  },
  sectorLabel: "Sector",
  sectorPlaceholder: "Choose a sector",
  sectorOther: "Which sector?",
  assetsLabel: "Current assets",
  assetsHelpScreens:
    "Screenshots of the screens you're optimising. PNG, JPG or WebP up to 10 MB, up to 20 files.",
  assetsHelpEmail:
    "The emails you're optimising: HTML or EML files, or screenshots. Up to 10 MB each, up to 20 files.",
  figmaLabel: "Figma link (optional)",
  figmaLinkInvalid:
    "That doesn't look like a Figma link. It should start with https://www.figma.com/.",
  clientDataLabel: "Client data (optional)",
  clientDataHelp:
    "Reviews, support tickets, analytics exports. CSV, TXT, PDF or XLSX up to 20 MB, up to 10 files.",
  uploadPrivacyHint:
    "Remove names, emails and other personal details before uploading. Uploads stay inside your workspace.",
  addFiles: "Add files",
  uploading: "Uploading…",
  removeFile: (file: string) => `Remove ${file}`,
  typeOrSize: (file: string, types: string, size: string) =>
    `"${file}" can't be added. Use ${types} up to ${size}.`,
  tooMany: (n: number) => `You can add up to ${n} files here.`,
  coachLoading: "Looking for a sharper version…",
  coachUnavailable:
    "Suggestions aren't available right now. Your text is saved, and you can carry on.",
  suggested: "Suggested",
  why: (reason: string) => `Why: ${reason}`,
  useSuggestion: "Use suggestion",
  editSuggestion: "Edit suggestion",
  keepMine: "Keep mine",
  lowSpecificity: "Low specificity",
  lowSpecificityNote:
    "Kept as written. It'll be marked 'low specificity' on everything that uses it.",
  saving: "Saving…",
  saved: "Saved just now",
  saveFailed: "Couldn't save. Check your connection and try again.",
  tryAgain: "Try again",
  offline: "You're offline. Changes will save when you reconnect.",
  approve: "Approve objectives",
  approving: "Approving…",
  needsObjectives: "Add both a business objective and a behavioural objective to continue.",
  needsSector: "Choose the client's sector so we can check it against our ethics rules.",
  needsAssets: "Add at least one current screen or email so Fluently knows what to optimise.",
  approvedBy: (name: string, time: string) => `Approved by ${name}, ${time}`,
  editBrief: "Edit brief",
  goToCanvas: "Go to canvas",
  editWarnsStale:
    "Changing the brief will mark everything built from it as out of date. You can regenerate those parts afterwards.",
  editConfirm: "Edit anyway",
  cancel: "Cancel",
} as const;

export const ethicsCopy = {
  checking: "Checking the brief against our ethics rules…",
  passed: "Ethics check passed",
  readyResearch:
    "Objectives approved and the ethics check passed. Next: research. It runs in the background and usually takes 10–20 minutes.",
  flaggedTitle: "The ethics check flagged this brief",
  editBrief: "Edit brief",
  override: "Override with a reason",
  reasonLabel: "Your reason",
  reasonHelp: "Recorded on the canvas with your name. At least 20 characters.",
  reasonTooShort: "Explain your reason in at least 20 characters. It's recorded on the canvas.",
  recordOverride: "Record override",
  overridden: (initials: string) => `Overridden by ${initials}`,
  refusedSector:
    "Fluently doesn't take on work in this sector. Talk to your Fluently admin if you think this is wrong.",
  archive: "Archive project",
  checkFailed: "The ethics check didn't run. Research stays paused until it does.",
  tryAgain: "Try again",
} as const;
