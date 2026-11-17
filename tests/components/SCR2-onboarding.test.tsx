import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { onboardingCopy as c } from "@/components/onboarding/copy";

function setup() {
  const onDone = vi.fn();
  const onOpenChange = vi.fn();
  render(<Onboarding open onOpenChange={onOpenChange} onDone={onDone} />);
  return { onDone, onOpenChange };
}

const [s1, s2, s3] = c.steps;

describe("SCR2 Onboarding", () => {
  it("step 1: heading, Step 1 of 3, Next and Skip, no Back", () => {
    setup();
    expect(screen.getByRole("heading", { name: s1.title })).toBeInTheDocument();
    expect(screen.getByText(s1.body)).toBeInTheDocument();
    expect(screen.getByText(c.stepOf(1))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.next })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.skip })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: c.back })).not.toBeInTheDocument();
  });

  it("step 2: heading, Back, Next and Skip", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: c.next }));
    expect(screen.getByRole("heading", { name: s2.title })).toBeInTheDocument();
    expect(screen.getByText(c.stepOf(2))).toBeInTheDocument();
    for (const name of [c.back, c.next, c.skip]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("step 3: heading, Back and Start my first project, which records completion", async () => {
    const { onDone, onOpenChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: c.next }));
    await userEvent.click(screen.getByRole("button", { name: c.next }));
    expect(screen.getByRole("heading", { name: s3.title })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: c.skip })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: c.back }));
    expect(screen.getByRole("heading", { name: s2.title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: c.next }));
    await userEvent.click(screen.getByRole("button", { name: c.start }));
    expect(onDone).toHaveBeenCalledWith("finished");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Skip records completion as skipped and closes", async () => {
    const { onDone, onOpenChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: c.skip }));
    expect(onDone).toHaveBeenCalledWith("skipped");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Escape also records completion as skipped", async () => {
    const { onDone } = setup();
    await userEvent.keyboard("{Escape}");
    expect(onDone).toHaveBeenCalledWith("skipped");
  });
});
