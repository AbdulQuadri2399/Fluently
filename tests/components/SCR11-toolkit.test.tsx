import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolkitPage } from "@/components/toolkit/ToolkitPage";
import { toolkitCopy as c } from "@/components/toolkit/copy";
import type { ToolkitVersionRow } from "@/lib/toolkit/service";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const file = (name: string) =>
  new File([readFileSync(`fixtures/toolkit/${name}`, "utf8")], name, { type: "text/csv" });

const v1: ToolkitVersionRow = {
  id: "v1",
  number: 1,
  fileName: "sample-toolkit.csv",
  uploadedAt: new Date().toISOString(),
  uploadedBy: "Dev Admin",
  principleCount: 30,
  evidence: { strong: 12, some: 12, none: 6 },
  isDefault: true,
};

function setup(
  opts: { isAdmin?: boolean; versions?: ToolkitVersionRow[]; save?: ReturnType<typeof vi.fn> } = {},
) {
  const save =
    opts.save ?? vi.fn(async () => ({ ok: true as const, data: { versionId: "v2", number: 2 } }));
  render(
    <ToolkitPage
      isAdmin={opts.isAdmin ?? true}
      versions={opts.versions ?? []}
      nextNumber={(opts.versions?.length ?? 0) + 1}
      save={save as never}
    />,
  );
  return save;
}

const choose = (name: string) => userEvent.upload(screen.getByLabelText(c.upload), file(name));

beforeEach(() => vi.clearAllMocks());

describe("SCR11 Toolkit", () => {
  it("empty (admin): toolkit.emptyAdmin with Upload toolkit", () => {
    setup();
    expect(screen.getByText(c.emptyAdmin)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.upload })).toBeInTheDocument();
  });

  it("empty (member): toolkit.noneYetMember, no upload", () => {
    setup({ isAdmin: false });
    expect(screen.getByText(c.noneYetMember)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("default: versions list with number, file, uploader, principles, evidence counts and Default chip; candidates tab", async () => {
    setup({ versions: [v1] });
    const table = screen.getByRole("table");
    expect(within(table).getByText(c.versionLabel(1))).toBeInTheDocument();
    expect(within(table).getByText(c.defaultChip)).toBeInTheDocument();
    expect(within(table).getByText("sample-toolkit.csv")).toBeInTheDocument();
    expect(within(table).getByText(/Dev Admin/)).toBeInTheDocument();
    expect(within(table).getByText(c.evidenceCounts(12, 12, 6))).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: c.candidates }));
    expect(screen.getByText(c.candidatesEmpty)).toBeInTheDocument();
  });

  it("preview valid: counts, warnings and Save as version n", async () => {
    setup();
    await choose("sample-toolkit.csv");
    const preview = await screen.findByRole("region", {
      name: c.previewTitle("sample-toolkit.csv"),
    });
    expect(within(preview).getByText(/30 rows · 30 principles/)).toBeInTheDocument();
    expect(within(preview).getByText(c.warnUnknownColumns(["Notes"]))).toBeInTheDocument();
    expect(within(preview).getByText(c.warnRelatedNotFound(13, "P999"))).toBeInTheDocument();
    expect(within(preview).getByRole("button", { name: c.saveAs(1) })).toBeInTheDocument();
  });

  it("preview of a sheet without IDs: says what was generated, merged and kept (AC33.5)", async () => {
    setup();
    await choose("sheet-layout.csv");
    const preview = await screen.findByRole("region", {
      name: c.previewTitle("sheet-layout.csv"),
    });
    expect(within(preview).getByText(/9 rows · 6 principles/)).toBeInTheDocument();
    expect(within(preview).getByText(c.warnGeneratedIds)).toBeInTheDocument();
    expect(
      within(preview).getByText(c.warnMergedSameName("Price Anchor", [5, 6, 7])),
    ).toBeInTheDocument();
    expect(within(preview).getByText(c.warnNoName(10))).toBeInTheDocument();
    expect(within(preview).getByText(c.warnThinRows(1, ["Quiet Imagery"]))).toBeInTheDocument();
    expect(
      within(preview).getByText(
        c.warnGoalsUnified(
          ["Prompt concious processing", "Prompt conscious processing"],
          "Prompt conscious processing",
        ),
      ),
    ).toBeInTheDocument();
    expect(within(preview).getByRole("button", { name: c.saveAs(1) })).toBeInTheDocument();
  });

  it("preview invalid: row errors with 03 copy, Choose another file, no save", async () => {
    setup();
    await choose("bad-duplicate-id.csv");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(c.errorsTitle);
    expect(alert).toHaveTextContent(c.errorDuplicateId([3, 6], "P002"));
    expect(screen.getByRole("button", { name: c.chooseAnother })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: c.saveAs(1) })).not.toBeInTheDocument();
  });

  it("missing columns and missing ID use their own copy", async () => {
    setup();
    await choose("bad-missing-columns.csv");
    expect(
      await screen.findByText(c.errorMissingColumns(["Sub-Goal", "Mechanism"])),
    ).toBeInTheDocument();
    await choose("bad-missing-id.csv");
    expect(await screen.findByText(c.errorMissingId(4))).toBeInTheDocument();
  });

  it("saving then saved: Saving version n…, then toast toolkit.saved", async () => {
    let finish: (v: unknown) => void = () => undefined;
    const save = vi.fn(() => new Promise((r) => (finish = r)));
    setup({ save });
    await choose("sample-toolkit.csv");
    await userEvent.click(await screen.findByRole("button", { name: c.saveAs(1) }));
    expect(screen.getByRole("button", { name: c.savingAs(1) })).toBeInTheDocument();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ fileName: "sample-toolkit.csv" }));
    finish({ ok: true, data: { versionId: "v1", number: 1 } });
    await vi.waitFor(() => expect(toast).toHaveBeenCalledWith(c.saved(1)));
    expect(refresh).toHaveBeenCalled();
  });

  it("save failed: common.saveFailed, preview kept", async () => {
    setup({ save: vi.fn(async () => ({ ok: false as const, code: "unavailable" as const })) });
    await choose("sample-toolkit.csv");
    await userEvent.click(await screen.findByRole("button", { name: c.saveAs(1) }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.saveFailed);
    expect(screen.getByRole("button", { name: c.saveAs(1) })).toBeInTheDocument();
  });
});
