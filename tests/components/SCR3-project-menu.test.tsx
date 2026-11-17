import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectMenu } from "@/components/projects/ProjectMenu";
import { projectsCopy as c } from "@/components/projects/copy";

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

// AC7.6–AC7.8: the project "…" menu.
const project = { id: "p1", name: "Halden onboarding", clientLabel: null };

function menu(isAdmin: boolean, over: Partial<Record<string, unknown>> = {}) {
  const actions = {
    update: vi.fn(async () => ({ ok: true as const, data: undefined })),
    archive: vi.fn(async () => ({ ok: true as const, data: undefined })),
    restore: vi.fn(async () => ({ ok: true as const, data: undefined })),
    remove: vi.fn(async () => ({ ok: true as const, data: undefined })),
    ...over,
  };
  const onDeleted = vi.fn();
  const onChanged = vi.fn();
  render(
    <ProjectMenu
      project={project}
      archived={false}
      isAdmin={isAdmin}
      actions={actions as never}
      onDeleted={onDeleted}
      onChanged={onChanged}
    />,
  );
  return { actions, onDeleted, onChanged };
}
const open = async () =>
  userEvent.click(screen.getByRole("button", { name: c.menu(project.name) }));

describe("Project menu", () => {
  it("members see Rename and Archive, not Delete", async () => {
    menu(false);
    await open();
    expect(await screen.findByRole("menuitem", { name: c.rename })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: c.archive })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: c.delete })).toBeNull();
  });

  it("rename: checks the name, saves name and client", async () => {
    const { actions, onChanged } = menu(false);
    await open();
    await userEvent.click(await screen.findByRole("menuitem", { name: c.rename }));
    const name = screen.getByLabelText(c.name);
    await userEvent.clear(name);
    await userEvent.click(screen.getByRole("button", { name: c.save }));
    expect(screen.getByText(c.nameInvalid)).toBeInTheDocument();
    expect(actions.update).not.toHaveBeenCalled();
    await userEvent.type(name, "Halden ID check");
    await userEvent.type(screen.getByLabelText(c.clientLabel), "Halden Bank");
    await userEvent.click(screen.getByRole("button", { name: c.save }));
    expect(actions.update).toHaveBeenCalledWith({
      id: "p1",
      name: "Halden ID check",
      clientLabel: "Halden Bank",
    });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("admin delete: needs the exact name typed", async () => {
    const { actions, onDeleted } = menu(true);
    await open();
    await userEvent.click(await screen.findByRole("menuitem", { name: c.delete }));
    expect(screen.getByRole("heading", { name: c.deleteTitle(project.name) })).toBeInTheDocument();
    expect(screen.getByText(c.deleteBody)).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: c.deleteConfirm });
    await userEvent.type(screen.getByLabelText(c.deleteConfirmLabel), "halden");
    expect(confirm).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText(c.deleteMismatch).length).toBeGreaterThan(0);
    await userEvent.click(confirm);
    expect(actions.remove).not.toHaveBeenCalled();
    await userEvent.clear(screen.getByLabelText(c.deleteConfirmLabel));
    await userEvent.type(screen.getByLabelText(c.deleteConfirmLabel), project.name);
    await userEvent.click(confirm);
    expect(actions.remove).toHaveBeenCalledWith("p1", project.name);
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });

  it("delete refused by the server: says why, keeps the dialog open", async () => {
    menu(true, { remove: vi.fn(async () => ({ ok: false as const, code: "unavailable" })) });
    await open();
    await userEvent.click(await screen.findByRole("menuitem", { name: c.delete }));
    await userEvent.type(screen.getByLabelText(c.deleteConfirmLabel), project.name);
    await userEvent.click(screen.getByRole("button", { name: c.deleteConfirm }));
    expect(await screen.findByText(c.saveFailed)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
