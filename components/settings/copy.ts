// Settings copy (SCR12), quoted from specs/fluently-mvp/03-ux-flows.md section 7.
export const settingsCopy = {
  title: "Settings",
  allowlist: "Who can join",
  allowlistHelp:
    "People with these emails, or any email at these domains, can create an account. Removing one stops new sign-ups; existing accounts stay.",
  allowlistPlaceholder: "name@company.com or @company.com",
  allowlistLabel: "Email or domain",
  allowlistEmpty: "No one can join yet. Add an email or a domain.",
  add: "Add",
  remove: "Remove",
  invalidAllowEntry: "Enter an email (name@company.com) or a domain (@company.com).",
  members: "Members",
  roleAdmin: "Admin",
  roleMember: "Member",
  you: "You",
  makeAdmin: "Make admin",
  makeMember: "Make member",
  deactivate: "Deactivate",
  reactivate: "Reactivate",
  deactivated: "Deactivated",
  deactivateConfirm: (email: string) =>
    `Deactivate ${email}? They'll be signed out and can't sign in. Their work stays in Fluently.`,
  lastAdmin: "Fluently needs at least one admin. Make someone else an admin first.",
  models: "AI models",
  modelsHelp:
    "The model each stage uses for new runs. Haiku is fastest and cheapest; Opus is the most thorough. Higher effort thinks longer and costs more.",
  colStage: "Stage",
  colModel: "Model",
  colEffort: "Effort",
  budget: "Budget",
  budgetHelp:
    "AI costs are charged in US dollars. Fluently shows them in pounds at this rate and pauses a project when it reaches its cap.",
  capLabel: "Cost cap per project (£)",
  rateLabel: "Pounds per US dollar",
  capInvalid: "Set a budget between £1 and £500.",
  rateInvalid: "Set a rate between 0.1 and 5.",
  services: "Agency services",
  servicesHelp: "Research methods Fluently can recommend in test plans, as well as desk research.",
  sectors: "Sensitive sectors",
  sectorsHelp:
    "Briefs in flagged sectors get a closer ethics check. Briefs in refused sectors are blocked.",
  flagList: "Flag for a closer check",
  refuseList: "Refuse",
  addItem: "Add",
  itemPlaceholder: "Type and press Enter",
  usage: "Usage",
  usageHelp: "AI cost per project and stage, in pounds.",
  usageEmpty: "No AI usage yet. Costs appear here once a project runs.",
  colProject: "Project",
  colCalls: "AI calls",
  colCost: "Cost",
  total: "Total",
  save: "Save changes",
  saving: "Saving…",
  saved: "Saved.",
  saveFailed: "Couldn't save. Check your connection and try again.",
  loadFailed: "Couldn't load this. Try again in a moment.",
  cancel: "Cancel",
} as const;

export const modelNames: Record<string, string> = {
  "claude-haiku-5-5": "Haiku 5.5",
  "claude-sonnet-5-5": "Sonnet 5.5",
  "claude-opus-5-5": "Opus 5.5",
};

export const effortNames: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra high",
  max: "Max",
};

export const aiStageNames: Record<string, string> = {
  intake: "Brief suggestions",
  ethics: "Ethics check",
  research: "Research",
  solutions: "Solutions",
  lofi: "Wireframes",
  testplan: "Test plan",
};
