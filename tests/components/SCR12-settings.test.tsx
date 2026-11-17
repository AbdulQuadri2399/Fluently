import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPage, type SettingsActions } from "@/components/settings/Settings";
import { settingsCopy as c } from "@/components/settings/copy";
import { DEFAULT_MODEL_PRICES, DEFAULT_STAGE_MODELS } from "@/lib/ai/models";
import type { MemberRow } from "@/lib/settings/service";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const settings = {
  costCapGbp: 10,
  gbpPerUsd: 0.79,
  stageModels: DEFAULT_STAGE_MODELS,
  modelPrices: DEFAULT_MODEL_PRICES,
  agencyServices: ["Implicit response test (IRT)", "Behavioural interviews"],
  sectorFlagList: ["gambling"],
  sectorRefuseList: [],
};
const me: MemberRow = {
  id: "m1",
  email: "ada@fluently.test",
  displayName: null,
  role: "admin",
  active: true,
};

function actions(over: Partial<SettingsActions> = {}): SettingsActions {
  return {
    updateWorkspaceSettings: vi.fn(async () => ({ ok: true as const, data: undefined })),
    addAllowEntry: vi.fn(async ({ value }) => ({
      ok: true as const,
      data: { id: "e2", value, kind: "email" as const },
    })),
    removeAllowEntry: vi.fn(async () => ({ ok: true as const, data: undefined })),
    setMemberRole: vi.fn(async () => ({ ok: true as const, data: undefined })),
    setMemberActive: vi.fn(async () => ({ ok: true as const, data: undefined })),
    ...over,
  };
}

function renderAdmin(a = actions()) {
  render(
    <SettingsPage
      meId="m1"
      admin={{
        settings,
        allowlist: [{ id: "e1", value: "@fluently.test", kind: "domain" }],
        members: [me],
      }}
      usage={[]}
      actions={a}
    />,
  );
  return a;
}

beforeEach(() => vi.clearAllMocks());

describe("SCR12 Settings", () => {
  it("default (admin): every section, with the allowlist, members and model choices", () => {
    renderAdmin();
    for (const title of [
      c.allowlist,
      c.members,
      c.models,
      c.budget,
      c.services,
      c.sectors,
      c.usage,
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByText("@fluently.test")).toBeInTheDocument();
    expect(screen.getByText("ada@fluently.test")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Model: Research" })).toHaveValue(
      "claude-haiku-5-5",
    );
    expect(screen.getByLabelText(c.capLabel)).toHaveValue("10");
    expect(screen.getByText(c.usageEmpty)).toBeInTheDocument();
  });

  it("default (member): usage read-only, no admin controls", () => {
    render(
      <SettingsPage
        meId="m2"
        admin={null}
        usage={[
          { projectId: "p1", projectName: "Northbank", stage: "research", calls: 3, costGbp: 0.42 },
        ]}
        actions={actions()}
      />,
    );
    expect(screen.getByRole("heading", { name: c.usage })).toBeInTheDocument();
    for (const title of [c.allowlist, c.members, c.models, c.budget]) {
      expect(screen.queryByRole("heading", { name: title })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Northbank")).toBeInTheDocument();
    expect(within(table).getAllByText("£0.42")).toHaveLength(2);
  });

  it("invalid entry: settings.invalidAllowEntry and nothing sent", async () => {
    const a = renderAdmin();
    await userEvent.type(screen.getByLabelText(c.allowlistLabel), "company.com");
    await userEvent.click(
      within(screen.getByRole("region", { name: c.allowlist })).getByRole("button", {
        name: c.add,
      }),
    );
    expect(screen.getByText(c.invalidAllowEntry)).toBeInTheDocument();
    expect(a.addAllowEntry).not.toHaveBeenCalled();
  });

  it("last admin: settings.lastAdmin when demoting the only admin", async () => {
    renderAdmin(
      actions({
        setMemberRole: vi.fn(async () => ({ ok: false as const, code: "conflict" as const })),
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: `${c.makeMember}: ${me.email}` }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.lastAdmin);
  });

  it("saved: toast common.saved after saving models, and the new entry is listed", async () => {
    const a = renderAdmin();
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Model: Solutions" }),
      "claude-sonnet-5-5",
    );
    await userEvent.click(
      within(screen.getByRole("region", { name: c.models })).getByRole("button", { name: c.save }),
    );
    expect(a.updateWorkspaceSettings).toHaveBeenCalledWith({
      stageModels: {
        ...DEFAULT_STAGE_MODELS,
        solutions: { model: "claude-sonnet-5-5", effort: "medium" },
      },
    });
    expect(toast).toHaveBeenCalledWith(c.saved);

    await userEvent.type(screen.getByLabelText(c.allowlistLabel), "new@company.com");
    await userEvent.click(
      within(screen.getByRole("region", { name: c.allowlist })).getByRole("button", {
        name: c.add,
      }),
    );
    expect(await screen.findByText("new@company.com")).toBeInTheDocument();
  });

  it("save failed: common.saveFailed, values kept", async () => {
    renderAdmin(
      actions({
        updateWorkspaceSettings: vi.fn(async () => ({
          ok: false as const,
          code: "unavailable" as const,
        })),
      }),
    );
    const cap = screen.getByLabelText(c.capLabel);
    await userEvent.clear(cap);
    await userEvent.type(cap, "25");
    await userEvent.click(
      within(screen.getByRole("region", { name: c.budget })).getByRole("button", { name: c.save }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(c.saveFailed);
    expect(cap).toHaveValue("25");
  });

  it("budget out of range: settings.capInvalid without saving", async () => {
    const a = renderAdmin();
    const cap = screen.getByLabelText(c.capLabel);
    await userEvent.clear(cap);
    await userEvent.type(cap, "501");
    await userEvent.click(
      within(screen.getByRole("region", { name: c.budget })).getByRole("button", { name: c.save }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(c.capInvalid);
    expect(a.updateWorkspaceSettings).not.toHaveBeenCalled();
  });
});
