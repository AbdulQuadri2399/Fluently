// Projects and home copy, quoted from specs/fluently-mvp/03-ux-flows.md section 7.
export const projectsCopy = {
  nameInvalid: "Give the project a name of up to 80 characters.",
  emptyTitle: "No projects yet",
  emptyBody:
    "Start with a brief. Fluently will help you sharpen the objectives, then research, recommend and wireframe, with every step traced to evidence.",
  noResults: "No projects match that search.",
  loadFailed: "Couldn't load this. Try again in a moment.",
  saveFailed: "Couldn't save. Check your connection and try again.",
  tryAgain: "Try again",
  clearSearch: "Clear search",
  title: "Projects",
  search: "Search projects",
  filterActive: "Active",
  filterArchived: "Archived",
  archive: "Archive",
  restore: "Restore",
  archived: "Project archived.",
  restored: "Project restored.",
  menu: (name: string) => `Project actions for ${name}`,
  rename: "Rename",
  delete: "Delete",
  renameTitle: "Rename project",
  clientLabel: "Client (optional)",
  save: "Save",
  saving: "Saving…",
  renamed: "Project renamed.",
  deleteTitle: (name: string) => `Delete ${name}?`,
  deleteBody:
    "This permanently deletes the brief, the tree, the report and every uploaded file. It can't be undone. Archive the project instead if you might need it again.",
  deleteConfirmLabel: "Type the project name to confirm",
  deleteConfirm: "Delete project",
  deleting: "Deleting…",
  deleteMismatch: "Type the name exactly as shown.",
  deleted: "Project deleted.",
  newProject: "New project",
  name: "Project name",
  mode: "What are you doing?",
  modeNew: "Create something new",
  modeNewHint: "Start from a brief with no existing design.",
  modeOptimise: "Optimise something that exists",
  modeOptimiseHint: "Improve current screens or emails. You'll add them to the brief.",
  channel: "Channel",
  channelScreens: "Screens and flows",
  channelEmail: "Email",
  client: "Client (optional)",
  create: "Create project",
  creating: "Creating…",
  cancel: "Cancel",
  // Home
  waiting: "Waiting for you",
  running: "Running",
  recent: "Recent projects",
  review: "Review",
  open: "Open",
  colName: "Name",
  colStage: "Stage",
  colChannel: "Channel",
  colEdited: "Edited",
  nothingWaiting: "Nothing needs you right now.",
  loadMore: "Load more",
  toolkitNoneYet:
    "Upload the Behavioural Design Toolkit before running research. Fluently cites every principle from it.",
  toolkitNoneYetMember:
    "Research is waiting for the toolkit. Ask your Fluently admin to upload it.",
  toolkitUpload: "Upload toolkit",
} as const;

export const stageNames: Record<string, string> = {
  intake: "Brief",
  ethics: "Ethics check",
  research: "Research",
  solutions: "Solutions",
  lofi: "Wireframes",
  testplan: "Test plan",
  complete: "Complete",
};

export const waitingLines: Record<string, string> = {
  intake: "Approve the objectives to start.",
  ethics: "The ethics check needs your decision.",
  research: "Research is done. Choose which opportunities to take forward.",
  solutions: "Solutions are ready. Choose which to turn into wireframes.",
  lofi: "Wireframes are ready to approve.",
  testplan: "The test plan is ready to approve.",
};

export const channelNames: Record<string, string> = { screens: "Screens", email: "Email" };

export const statusNames: Record<string, string> = {
  in_progress: "In progress",
  waiting: "Waiting for you",
  running: "Running",
  failed: "Failed",
  complete: "Complete",
  blocked: "Blocked",
};

export function greeting(now: Date, name: string): string {
  const h = now.getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${name}`;
}

export function runningLine(stage: string): string {
  return `${stageNames[stage] ?? stage} is running.`;
}

export function editedBy(time: string, name: string): string {
  return name ? `${time} by ${name}` : time;
}

/** "just now" / "{n} min ago" / "{n} hours ago" / "Yesterday" / "3 Nov" (03 section 7, time.relative). */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const mins = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (then.getTime() >= startOfToday) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  if (then.getTime() >= startOfToday - 86400000) return "Yesterday";
  return then.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
