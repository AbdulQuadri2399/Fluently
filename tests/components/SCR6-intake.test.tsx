import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emailCopy } from "@/components/email/copy";
import { BriefPage, type BriefActions, type BriefData } from "@/components/intake/BriefPage";
import { ethicsCopy as e, intakeCopy as c } from "@/components/intake/copy";
import type { EthicsView } from "@/components/intake/EthicsPanel";

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));
const reduced = vi.hoisted(() => ({ value: false }));
vi.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => reduced.value }));

const empty = {
  business_objective: "",
  behavioural_objective: "",
  audience_context: "",
  constraints: "",
  sector: "",
  sector_other: "",
  figma_link: "",
  competitors: "",
};
const filled = {
  ...empty,
  business_objective: "Raise ID checks by 15% in 3 months",
  behavioural_objective: "New customers upload ID on day one",
  sector: "Banking",
};
const suggestion = {
  suggestion: "New customers upload their ID within their first day.",
  reason: "Naming who acts and when makes it observable.",
  lowSpecificity: true,
};

function data(over: Partial<BriefData> = {}, values = empty): BriefData {
  return {
    project: {
      id: "p1",
      name: "Northbank KYC",
      mode: "new",
      channel: "screens",
      status: "in_progress",
    },
    intake: { version: 1, values, lowSpecificity: {}, approved: null },
    uploads: [],
    ethics: null,
    ...over,
  };
}

function actions(over: Partial<BriefActions> = {}): BriefActions {
  let v = 1;
  return {
    saveField: vi.fn(async () => ({ ok: true as const, data: { version: ++v } })),
    coach: vi.fn(async () => ({ ok: true as const, data: suggestion })),
    resolve: vi.fn(async (i) => ({
      ok: true as const,
      data: { version: ++v, lowSpecificity: i.action === "keep" && i.lowSpecificity },
    })),
    uploadFile: vi.fn(async (kind, file) => ({
      ok: true as const,
      data: {
        id: file.name,
        kind,
        fileName: file.name,
        mime: file.type,
        sizeBytes: file.size,
        meta: {},
      },
    })),
    removeFile: vi.fn(async () => ({ ok: true as const, data: undefined })),
    approve: vi.fn(async () => ({ ok: true as const, data: { stageRunId: "r1" } })),
    editIntake: vi.fn(async () => ({ ok: true as const, data: undefined })),
    override: vi.fn(async () => ({ ok: true as const, data: { overrideId: "o1" } })),
    retryEthics: vi.fn(async () => ({ ok: true as const, data: { stageRunId: "r2" } })),
    archive: vi.fn(async () => ({ ok: true as const, data: undefined })),
    ...over,
  };
}

const behavioural = () => screen.getByLabelText(c.fields.behavioural_objective.label);

async function typeAndLeave(text: string) {
  await userEvent.type(behavioural(), text);
  await userEvent.tab();
}

beforeEach(() => {
  vi.clearAllMocks();
  reduced.value = false;
});

describe("SCR6 Brief", () => {
  it("default (new mode): all fields per AC8.1 except assets, helper text under each", () => {
    render(<BriefPage data={data()} actions={actions()} />);
    for (const f of Object.values(c.fields)) {
      expect(screen.getByLabelText(f.label)).toBeInTheDocument();
      expect(screen.getByText(f.help)).toBeInTheDocument();
    }
    expect(screen.getByLabelText(c.sectorLabel)).toBeInTheDocument();
    expect(screen.getByText(c.clientDataLabel)).toBeInTheDocument();
    expect(screen.queryByText(c.assetsLabel)).not.toBeInTheDocument();
  });

  it("default (optimise mode): current assets section with Figma link", () => {
    render(
      <BriefPage
        data={data({ project: { ...data().project, mode: "optimise" } })}
        actions={actions()}
      />,
    );
    expect(screen.getByText(c.assetsLabel)).toBeInTheDocument();
    expect(screen.getByText(c.assetsHelpScreens)).toBeInTheDocument();
    expect(screen.getByLabelText(c.figmaLabel)).toBeInTheDocument();
  });

  it("coaching loading: shows while the suggestion is on its way", async () => {
    const a = actions({ coach: vi.fn(() => new Promise(() => undefined)) as never });
    render(<BriefPage data={data()} actions={a} />);
    await typeAndLeave("Upload their ID");
    expect(await screen.findByText(c.coachLoading)).toBeInTheDocument();
  });

  it("coaching suggestion (MI1): card with suggestion, why, three actions; fade + rise", async () => {
    render(<BriefPage data={data()} actions={actions()} />);
    await typeAndLeave("Upload their ID");
    const card = await screen.findByRole("region", {
      name: `${c.suggested}: ${c.fields.behavioural_objective.label}`,
    });
    expect(within(card).getByText(suggestion.suggestion)).toBeInTheDocument();
    expect(within(card).getByText(c.why(suggestion.reason))).toBeInTheDocument();
    for (const name of [c.useSuggestion, c.editSuggestion, c.keepMine]) {
      expect(within(card).getByRole("button", { name })).toBeInTheDocument();
    }
    expect(card).toHaveClass("slide-in-from-bottom-2");
  });

  it("MI1 reduced motion: fade only", async () => {
    reduced.value = true;
    render(<BriefPage data={data()} actions={actions()} />);
    await typeAndLeave("Upload their ID");
    const card = await screen.findByTestId("suggestion-behavioural_objective");
    expect(card).toHaveClass("fade-in-0");
    expect(card).not.toHaveClass("slide-in-from-bottom-2");
  });

  it("MI2 use suggestion: field text swaps and is saved", async () => {
    const a = actions();
    render(<BriefPage data={data()} actions={a} />);
    await typeAndLeave("Upload their ID");
    await userEvent.click(await screen.findByRole("button", { name: c.useSuggestion }));
    expect(behavioural()).toHaveValue(suggestion.suggestion);
    expect(a.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "use",
        value: suggestion.suggestion,
        field: "behavioural_objective",
      }),
    );
    expect(await screen.findByText(c.saved)).toBeInTheDocument();
  });

  it("coaching unavailable: intake.coachUnavailable, text kept", async () => {
    render(
      <BriefPage
        data={data()}
        actions={actions({
          coach: vi.fn(async () => ({ ok: false as const, code: "unavailable" as const })),
        })}
      />,
    );
    await typeAndLeave("Upload their ID");
    expect(await screen.findByText(c.coachUnavailable)).toBeInTheDocument();
    expect(behavioural()).toHaveValue("Upload their ID");
  });

  it("low specificity kept: chip and intake.lowSpecificityNote", async () => {
    render(<BriefPage data={data()} actions={actions()} />);
    await typeAndLeave("Upload their ID");
    await userEvent.click(await screen.findByRole("button", { name: c.keepMine }));
    expect(await screen.findByText(c.lowSpecificity)).toBeInTheDocument();
    expect(screen.getByText(c.lowSpecificityNote)).toBeInTheDocument();
    expect(behavioural()).toHaveValue("Upload their ID");
  });

  it("upload in progress, then listed", async () => {
    let finish: (v: unknown) => void = () => undefined;
    const a = actions({ uploadFile: vi.fn(() => new Promise((r) => (finish = r))) as never });
    render(<BriefPage data={data()} actions={a} />);
    const file = new File(["a,b"], "reviews.csv", { type: "text/csv" });
    await userEvent.upload(screen.getByLabelText(`${c.addFiles}: ${c.clientDataLabel}`), file);
    expect(await screen.findByText(`reviews.csv · ${c.uploading}`)).toBeInTheDocument();
    await act(async () =>
      finish({
        ok: true,
        data: {
          id: "u1",
          kind: "client_data",
          fileName: "reviews.csv",
          mime: "text/csv",
          sizeBytes: 3,
          meta: {},
        },
      }),
    );
    expect(await screen.findByText("reviews.csv")).toBeInTheDocument();
  });

  it("upload rejected: upload.typeOrSize names the file; nothing sent", async () => {
    const a = actions();
    render(<BriefPage data={data()} actions={a} />);
    const file = new File(["x"], "brief.docx", { type: "application/msword" });
    await userEvent.upload(screen.getByLabelText(`${c.addFiles}: ${c.clientDataLabel}`), file, {
      applyAccept: false,
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      c.typeOrSize("brief.docx", "CSV, TXT, PDF or XLSX", "20 MB"),
    );
    expect(a.uploadFile).not.toHaveBeenCalled();
  });

  it("autosave: saved within 2 s, then Saved just now", async () => {
    const a = actions();
    render(<BriefPage data={data()} actions={a} />);
    await userEvent.type(screen.getByLabelText(c.fields.audience_context.label), "Busy parents");
    await waitFor(
      () =>
        expect(a.saveField).toHaveBeenCalledWith(
          expect.objectContaining({ field: "audience_context", value: "Busy parents" }),
        ),
      { timeout: 3000 },
    );
    expect(await screen.findByText(c.saved)).toBeInTheDocument();
  });

  it("autosave failed: common.saveFailed with Try again", async () => {
    const failing = actions({
      saveField: vi.fn(async () => ({ ok: false as const, code: "unavailable" as const })),
    });
    render(<BriefPage data={data()} actions={failing} />);
    await userEvent.type(screen.getByLabelText(c.fields.constraints.label), "Brand rules");
    expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toHaveTextContent(c.saveFailed);
    expect(screen.getByRole("button", { name: c.tryAgain })).toBeInTheDocument();
  });

  it("missing objective: Approve disabled with intake.needsObjectives", () => {
    render(<BriefPage data={data()} actions={actions()} />);
    expect(screen.getAllByText(c.needsObjectives).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: c.approve })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("ready: Approve enabled and starts the ethics check", async () => {
    const a = actions();
    render(<BriefPage data={data({}, filled)} actions={a} />);
    const approve = screen.getByRole("button", { name: c.approve });
    expect(approve).not.toHaveAttribute("aria-disabled");
    await userEvent.click(approve);
    expect(a.approve).toHaveBeenCalledWith("p1");
    expect(refresh).toHaveBeenCalled();
  });

  const approved = (ethics: EthicsView | null) =>
    data({
      intake: {
        version: 3,
        values: filled,
        lowSpecificity: {},
        approved: { by: "Ada", at: "17 Nov 2026" },
      },
      ethics,
    });

  it("approved: read-only summary with Edit brief and Go to canvas; editing warns intake.editWarnsStale", async () => {
    const a = actions();
    render(<BriefPage data={approved({ state: "running" })} actions={a} />);
    expect(screen.getByText(c.approvedBy("Ada", "17 Nov 2026"))).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText(e.checking)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: c.goToCanvas })).toHaveAttribute(
      "href",
      "/projects/p1",
    );
    await userEvent.click(screen.getByRole("button", { name: c.editBrief }));
    expect(screen.getByText(c.editWarnsStale)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: c.editConfirm }));
    expect(a.editIntake).toHaveBeenCalledWith("p1");
  });

  it("Go to canvas only shows once the objectives are approved", () => {
    render(<BriefPage data={data()} actions={actions()} />);
    expect(screen.queryByRole("link", { name: c.goToCanvas })).not.toBeInTheDocument();
  });

  it("ethics passed: badge and checkpoint.readyResearch", () => {
    render(<BriefPage data={approved({ state: "passed" })} actions={actions()} />);
    expect(screen.getByText(e.passed)).toBeInTheDocument();
    expect(screen.getByText(e.readyResearch)).toBeInTheDocument();
  });

  it("ethics flagged: reasons, Edit brief, override needs 20+ characters", async () => {
    const a = actions();
    render(
      <BriefPage
        data={approved({
          state: "flagged",
          nodeId: "n1",
          reasons: [{ rule: "Fake urgency or scarcity", reason: "Mentions a countdown." }],
        })}
        actions={a}
      />,
    );
    expect(screen.getByRole("heading", { name: e.flaggedTitle })).toBeInTheDocument();
    expect(screen.getByText("Fake urgency or scarcity.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: e.editBrief }).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: e.override }));
    await userEvent.type(screen.getByLabelText(e.reasonLabel), "Too short");
    expect(screen.getAllByText(e.reasonTooShort, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: e.recordOverride })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await userEvent.type(screen.getByLabelText(e.reasonLabel), " because stock is real");
    await userEvent.click(screen.getByRole("button", { name: e.recordOverride }));
    expect(a.override).toHaveBeenCalledWith("p1", "n1", "Too short because stock is real");
  });

  it("MI11: overridden badge shows initials", () => {
    render(
      <BriefPage
        data={approved({
          state: "overridden",
          reasons: [],
          overrideReason: "Stock really is limited to two.",
          initials: "AL",
        })}
        actions={actions()}
      />,
    );
    const badge = screen.getByText(e.overridden("AL"));
    expect(badge).toHaveClass("fade-in-0");
    expect(screen.getByText("Stock really is limited to two.")).toBeInTheDocument();
  });

  it("refused sector: ethics.refusedSector with Archive project, no override", async () => {
    const a = actions({
      approve: vi.fn(async () => ({ ok: false as const, code: "forbidden" as const })),
    });
    render(<BriefPage data={data({}, filled)} actions={a} />);
    await userEvent.click(screen.getByRole("button", { name: c.approve }));
    expect(await screen.findByText(e.refusedSector)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: e.override })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: e.archive }));
    expect(push).toHaveBeenCalledWith("/projects");
  });

  it("ethics check failed: ethics.checkFailed with Try again", async () => {
    const a = actions();
    render(<BriefPage data={approved({ state: "failed" })} actions={a} />);
    expect(screen.getByText(e.checkFailed)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: e.tryAgain }));
    expect(a.retryEthics).toHaveBeenCalledWith("p1");
  });

  describe("phase 1: emails and competitors (AC31.2, AC32.6)", () => {
    const emailProject = (over: Partial<BriefData> = {}) =>
      data(
        {
          project: {
            id: "p1",
            name: "Examplebank emails",
            mode: "optimise",
            channel: "email",
            status: "in_progress",
          },
          ...over,
        },
        filled,
      );

    it("an email project lists its emails in place of current assets; approval needs one", async () => {
      const a = actions();
      render(<BriefPage data={emailProject()} actions={a} />);
      expect(screen.getByRole("heading", { name: emailCopy.section })).toBeInTheDocument();
      expect(screen.queryByText(c.assetsLabel)).not.toBeInTheDocument();
      expect(screen.getByText(emailCopy.empty)).toBeInTheDocument();
      expect(screen.getAllByText(emailCopy.needsEmails).length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: c.approve })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("with an email added the brief can be approved; emails can be removed", async () => {
      const removeEmail = vi.fn(async () => ({ ok: true as const, data: undefined }));
      const a = actions({ removeEmail });
      render(
        <BriefPage
          data={emailProject({
            emails: [
              {
                id: "e1",
                nodeId: "n1",
                subject: "Welcome to Examplebank",
                source: "paste",
                createdAt: "",
              },
            ],
          })}
          actions={a}
        />,
      );
      expect(screen.getByText("Welcome to Examplebank")).toBeInTheDocument();
      expect(screen.queryByText(emailCopy.needsEmails)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: c.approve })).not.toHaveAttribute(
        "aria-disabled",
        "true",
      );
      await userEvent.click(
        screen.getByRole("button", { name: `${emailCopy.remove}: Welcome to Examplebank` }),
      );
      expect(removeEmail).toHaveBeenCalledWith("e1");
    });

    it("Add email opens the dialog", async () => {
      const addPaste = vi.fn(async () => ({ ok: true as const, data: { id: "e1" } }));
      const a = actions({ addEmail: { addPaste, addFile: vi.fn() } });
      render(<BriefPage data={emailProject()} actions={a} />);
      await userEvent.click(screen.getByRole("button", { name: emailCopy.add }));
      expect(screen.getByRole("dialog", { name: emailCopy.addTitle })).toBeInTheDocument();
    });

    it("a screens project is unchanged: still current assets, no emails section", () => {
      render(
        <BriefPage
          data={data(
            {
              project: {
                id: "p1",
                name: "S",
                mode: "optimise",
                channel: "screens",
                status: "in_progress",
              },
            },
            filled,
          )}
          actions={actions()}
        />,
      );
      expect(screen.getByText(c.assetsLabel)).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: emailCopy.section })).not.toBeInTheDocument();
    });

    it("competitors: optional, saves, and more than five is flagged and not saved", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const saveField = vi.fn(async () => ({ ok: true as const, data: { version: 2 } }));
      render(<BriefPage data={data({}, filled)} actions={actions({ saveField })} />);
      const box = screen.getByLabelText(c.competitorsLabel);
      expect(screen.getByText(c.competitorsHelp)).toBeInTheDocument();
      await userEvent.type(box, "Alpha Bank{enter}Beta Bank");
      await vi.advanceTimersByTimeAsync(1300);
      expect(saveField).toHaveBeenCalledWith(
        expect.objectContaining({ field: "competitors", value: "Alpha Bank\nBeta Bank" }),
      );
      saveField.mockClear();
      await userEvent.clear(box);
      await userEvent.type(box, "A{enter}B{enter}C{enter}D{enter}E{enter}F");
      await vi.advanceTimersByTimeAsync(1300);
      expect(screen.getByText(c.competitorsTooMany)).toBeInTheDocument();
      expect(saveField).not.toHaveBeenCalledWith(
        expect.objectContaining({ field: "competitors", value: expect.stringContaining("F") }),
      );
      vi.useRealTimers();
    });
  });
});
