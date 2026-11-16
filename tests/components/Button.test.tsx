import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("Button (03b §6, MI12)", () => {
  it.each(["primary", "secondary", "ghost", "danger"] as const)("renders the %s variant", (v) => {
    mockReducedMotion(false);
    render(<Button variant={v}>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("data-variant", v);
  });

  it("disabled with a reason is aria-disabled, describes why, and ignores clicks", async () => {
    mockReducedMotion(false);
    const onClick = vi.fn();
    render(
      <Button disabledReason="Add both objectives to continue." onClick={onClick}>
        Approve objectives
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Approve objectives" });
    expect(btn).toHaveAttribute("aria-disabled", "true");
    expect(btn).toHaveAccessibleDescription("Add both objectives to continue.");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("loading shows the …ing label and is busy", () => {
    mockReducedMotion(false);
    render(
      <Button loading loadingLabel="Signing in…">
        Sign in
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Signing in…" });
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("MI12: press scale applies normally", () => {
    mockReducedMotion(false);
    render(<Button>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" }).className).toContain("active:scale-[0.98]");
  });

  it("MI12: no press scale under prefers-reduced-motion", () => {
    mockReducedMotion(true);
    render(<Button>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" }).className).not.toContain("scale-");
  });
});
