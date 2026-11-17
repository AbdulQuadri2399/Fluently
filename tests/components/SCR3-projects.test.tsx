import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectsList } from "@/components/projects/ProjectsList";
import {
  EmptyProjects,
  LoadError,
  ProjectsSkeleton,
  ToolkitBanner,
} from "@/components/projects/States";
import { projectsCopy as c, statusNames } from "@/components/projects/copy";
import type { ProjectRow } from "@/lib/projects/service";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  usePathname: () => "/projects",
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

const row = (over: Partial<ProjectRow> = {}): ProjectRow => ({
  id: crypto.randomUUID(),
  name: "Northbank savings nudge",
  mode: "optimise",
  channel: "screens",
  clientLabel: null,
  status: "waiting",
  currentStage: "research",
  updatedAt: new Date().toISOString(),
  updatedByName: "Ada",
  ...over,
});

function list(
  items: ProjectRow[],
  opts: { search?: string; filter?: "active" | "archived"; nextCursor?: string | null } = {},
) {
  const actions = {
    list: vi.fn(async () => ({
      ok: true as const,
      data: { items: [row({ name: "Older" })], nextCursor: null },
    })),
    archive: vi.fn(async () => ({ ok: true as const, data: undefined })),
    restore: vi.fn(async () => ({ ok: true as const, data: undefined })),
    update: vi.fn(async () => ({ ok: true as const, data: undefined })),
    remove: vi.fn(async () => ({ ok: true as const, data: undefined })),
  };
  render(
    <ProjectsList
      initial={{ items, nextCursor: opts.nextCursor ?? null }}
      filter={opts.filter ?? "active"}
      search={opts.search ?? ""}
      {...actions}
    />,
  );
  return actions;
}

describe("SCR3 Projects", () => {
  it("loading: five skeleton rows, revealed after 300 ms", () => {
    const { container } = render(<ProjectsSkeleton />);
    const wrap = container.firstElementChild!;
    expect(wrap).toHaveClass("appear-late");
    expect(wrap.children).toHaveLength(5);
  });

  it("empty (first use): projects.emptyTitle, projects.emptyBody and New project", () => {
    render(<EmptyProjects action={<button>{c.newProject}</button>} />);
    expect(screen.getByRole("heading", { name: c.emptyTitle })).toBeInTheDocument();
    expect(screen.getByText(c.emptyBody)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.newProject })).toBeInTheDocument();
  });

  it("default: table with name, stage, status, channel and edited by; Active / Archived; search", () => {
    list([
      row(),
      row({
        name: "Orla renewal emails",
        channel: "email",
        status: "complete",
        currentStage: "complete",
      }),
    ]);
    const table = screen.getByRole("table");
    expect(within(table).getByRole("link", { name: "Northbank savings nudge" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/projects\//),
    );
    expect(within(table).getByText(statusNames.waiting!)).toBeInTheDocument();
    expect(within(table).getByText("Research")).toBeInTheDocument();
    expect(within(table).getByText("Email")).toBeInTheDocument();
    expect(within(table).getAllByText(/by Ada$/)).toHaveLength(2);
    expect(screen.getByRole("button", { name: c.filterActive })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: c.filterArchived })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("searchbox", { name: c.search })).toBeInTheDocument();
  });

  it("default: archive removes the row; Load more fetches the next page", async () => {
    const p = row();
    const actions = list([p], { nextCursor: "x|y" });
    await userEvent.click(screen.getByRole("button", { name: c.menu(p.name) }));
    await userEvent.click(await screen.findByRole("menuitem", { name: c.archive }));
    expect(actions.archive).toHaveBeenCalledWith(p.id);
    expect(screen.queryByText(p.name)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: c.loadMore }));
    expect(actions.list).toHaveBeenCalledWith({
      filter: "active",
      search: undefined,
      cursor: "x|y",
    });
    expect(await screen.findByText("Older")).toBeInTheDocument();
  });

  it("archived: rows offer Restore", async () => {
    const p = row();
    const actions = list([p], { filter: "archived" });
    await userEvent.click(screen.getByRole("button", { name: c.menu(p.name) }));
    await userEvent.click(await screen.findByRole("menuitem", { name: c.restore }));
    expect(actions.restore).toHaveBeenCalledWith(p.id);
  });

  it("empty (no results): projects.noResults with Clear search", async () => {
    list([], { search: "zzz" });
    expect(screen.getByText(c.noResults)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: c.clearSearch }));
    expect(push).toHaveBeenLastCalledWith("/projects");
  });

  it("error: common.loadFailed with Try again", async () => {
    const retry = vi.fn();
    render(<LoadError onRetry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent(c.loadFailed);
    await userEvent.click(screen.getByRole("button", { name: c.tryAgain }));
    expect(retry).toHaveBeenCalled();
  });

  it("no toolkit yet (admin): toolkit.noneYet with Upload toolkit", () => {
    render(<ToolkitBanner isAdmin />);
    expect(screen.getByRole("status")).toHaveTextContent(c.toolkitNoneYet);
    expect(screen.getByRole("link", { name: c.toolkitUpload })).toHaveAttribute("href", "/toolkit");
  });

  it("no toolkit yet (member): toolkit.noneYetMember, no upload link", () => {
    render(<ToolkitBanner isAdmin={false} />);
    expect(screen.getByRole("status")).toHaveTextContent(c.toolkitNoneYetMember);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
