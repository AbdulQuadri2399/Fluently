import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import { projectsCopy as c } from "@/components/projects/copy";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

async function open(action = vi.fn()) {
  render(<NewProjectDialog action={action} />);
  await userEvent.click(screen.getByRole("button", { name: c.newProject }));
  return action;
}

describe("SCR4 New project dialog", () => {
  it("default: name, both mode choices, both channels, client, Cancel and Create project", async () => {
    await open();
    expect(screen.getByRole("dialog", { name: c.newProject })).toBeInTheDocument();
    expect(screen.getByLabelText(c.name)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: new RegExp(c.modeNew) })).toBeChecked();
    expect(screen.getByRole("radio", { name: new RegExp(c.modeOptimise) })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: c.channelScreens })).toBeChecked();
    expect(screen.getByRole("radio", { name: c.channelEmail })).toBeInTheDocument();
    expect(screen.getByLabelText(c.client)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.cancel })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.create })).toBeInTheDocument();
  });

  it("invalid: empty name shows project.nameInvalid and doesn't submit", async () => {
    const action = await open();
    await userEvent.click(screen.getByRole("button", { name: c.create }));
    expect(await screen.findByText(c.nameInvalid)).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("saving: button shows Creating… while the project is created", async () => {
    await open(vi.fn(() => new Promise(() => undefined)));
    await userEvent.type(screen.getByLabelText(c.name), "Halden onboarding");
    await userEvent.click(screen.getByRole("button", { name: c.create }));
    expect(screen.getByRole("button", { name: c.creating })).toHaveAttribute("aria-busy", "true");
  });

  it("error: a failed save shows common.saveFailed", async () => {
    await open(vi.fn(async () => ({ ok: false as const, code: "unavailable" as const })));
    await userEvent.type(screen.getByLabelText(c.name), "Halden onboarding");
    await userEvent.click(screen.getByRole("button", { name: c.create }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.saveFailed);
  });

  it("success: sends the chosen mode and channel, then opens the project", async () => {
    const action = await open(vi.fn(async () => ({ ok: true as const, data: { id: "p1" } })));
    await userEvent.type(screen.getByLabelText(c.name), "Halden onboarding");
    await userEvent.click(screen.getByRole("radio", { name: new RegExp(c.modeOptimise) }));
    await userEvent.click(screen.getByRole("radio", { name: c.channelEmail }));
    await userEvent.click(screen.getByRole("button", { name: c.create }));
    expect(action).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Halden onboarding", mode: "optimise", channel: "email" }),
    );
    expect(push).toHaveBeenCalledWith("/projects/p1/brief");
  });
});
