import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckpointBar } from "@/components/canvas/CheckpointBar";
import { ProjectShell, type HeaderInfo } from "@/components/canvas/ProjectShell";
import { canvasCopy as c } from "@/components/canvas/copy";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
  usePathname: () => "/projects/p1",
}));
const auth = vi.hoisted(() => ({ user: { id: "u1" } as null | { id: string } }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: auth.user }, error: null }) },
  }),
}));

const header: HeaderInfo = {
  id: "p1",
  name: "Northbank KYC",
  mode: "optimise",
  channel: "screens",
  pinned: 1,
  latest: 2,
  spentGbp: 0.42,
  capGbp: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: "u1" };
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});

function shell(signIn = vi.fn(async () => ({ ok: true as const, data: { next: "/home" } }))) {
  render(
    <ProjectShell header={header} signIn={signIn}>
      <textarea aria-label="Draft" defaultValue="" />
    </ProjectShell>,
  );
  return signIn;
}

describe("SCR5 project shell", () => {
  it("header: name, mode · channel, toolkit pin with newer version, spend; tabs", () => {
    shell();
    expect(screen.getByRole("heading", { name: "Northbank KYC" })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Optimise · Screens · Toolkit v1 \(newer v2 available\) · £0.42 of £10.00 AI budget/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: c.tabs.canvas })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: c.tabs.brief })).toHaveAttribute(
      "href",
      "/projects/p1/brief",
    );
  });

  it("intake first: the decision bar points to the brief", () => {
    render(
      <CheckpointBar
        projectId="p1"
        state={{ kind: "intakeFirst" }}
        onStart={async () => undefined}
        onCancel={async () => undefined}
      />,
    );
    expect(screen.getByText(c.intakeFirst)).toBeInTheDocument();
  });

  it("offline: common.offline banner", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    shell();
    expect(screen.getByRole("status")).toHaveTextContent(c.offline);
  });

  it("session expired: sign-in window over the page; typed text kept after signing in (FF14)", async () => {
    const signIn = shell();
    await userEvent.type(screen.getByLabelText("Draft"), "Half-written idea");
    auth.user = null;
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(await screen.findByText(c.sessionExpired)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Email"), "ada@fluently.test");
    await userEvent.type(screen.getByLabelText("Password"), "password-dev-123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(signIn).toHaveBeenCalledWith({
      email: "ada@fluently.test",
      password: "password-dev-123",
    });
    await waitFor(() => expect(screen.queryByText(c.sessionExpired)).not.toBeInTheDocument());
    expect(screen.getByLabelText("Draft")).toHaveValue("Half-written idea");
  });
});
