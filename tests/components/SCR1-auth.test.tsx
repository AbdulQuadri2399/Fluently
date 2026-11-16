import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LinkExpiredForm,
  ResetRequestForm,
  SignInForm,
  SignUpForm,
} from "@/components/auth/AuthForms";
import { authCopy as c } from "@/components/auth/copy";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function fill(email: string, password?: string) {
  await userEvent.type(screen.getByLabelText(c.emailLabel), email);
  if (password !== undefined)
    await userEvent.type(screen.getByLabelText(c.passwordLabel), password);
}

describe("SCR1 sign in", () => {
  it("default: email, password, Sign in, Create account and Forgot password", () => {
    render(<SignInForm action={vi.fn()} />);
    expect(screen.getByRole("heading", { name: c.signInTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(c.emailLabel)).toBeInTheDocument();
    expect(screen.getByLabelText(c.passwordLabel)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.signIn })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: c.createAccount })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("link", { name: c.forgotPassword })).toHaveAttribute("href", "/reset");
  });

  it("loading: button shows 'Signing in…' and fields are disabled", async () => {
    render(<SignInForm action={() => new Promise(() => undefined)} />);
    await fill("a@fluently.test", "password-dev-123");
    await userEvent.click(screen.getByRole("button", { name: c.signIn }));
    expect(screen.getByRole("button", { name: c.signingIn })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText(c.emailLabel)).toBeDisabled();
  });

  it("wrong credentials: shows auth.wrongCredentials", async () => {
    render(
      <SignInForm action={async () => ({ ok: false as const, code: "validation" as const })} />,
    );
    await fill("a@fluently.test", "wrong-password-1");
    await userEvent.click(screen.getByRole("button", { name: c.signIn }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.wrongCredentials);
  });

  it("offline: shows common.offline and blocks submit", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const action = vi.fn();
    render(<SignInForm action={action} />);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(c.offline);
    await fill("a@fluently.test", "password-dev-123");
    await userEvent.click(screen.getByRole("button", { name: c.signIn }));
    expect(action).not.toHaveBeenCalled();
  });
});

describe("SCR1 sign up", () => {
  it("not allowlisted: shows auth.notAllowed", async () => {
    render(<SignUpForm action={async () => ({ ok: false, code: "forbidden" })} />);
    await fill("someone@elsewhere.com", "long-enough-password");
    await userEvent.click(screen.getByRole("button", { name: c.createAccount }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.notAllowed);
  });

  it("success: shows auth.checkEmail", async () => {
    render(<SignUpForm action={async () => ({ ok: true, data: undefined })} />);
    await fill("new@fluently.test", "long-enough-password");
    await userEvent.click(screen.getByRole("button", { name: c.createAccount }));
    expect(await screen.findByText(c.checkEmail)).toBeInTheDocument();
  });

  it("validation: invalid email and short password show 03 copy", async () => {
    const action = vi.fn();
    render(<SignUpForm action={action} />);
    await fill("not-an-email", "short");
    await userEvent.click(screen.getByRole("button", { name: c.createAccount }));
    expect(await screen.findByText(c.invalidEmail)).toBeInTheDocument();
    expect(screen.getByText(c.passwordShort)).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });
});

describe("SCR1 reset", () => {
  it("reset sent: shows auth.resetSent whatever the email", async () => {
    render(<ResetRequestForm action={async () => ({ ok: true, data: undefined })} />);
    await fill("anyone@anywhere.com");
    await userEvent.click(screen.getByRole("button", { name: c.sendResetLink }));
    expect(await screen.findByText(c.resetSent)).toBeInTheDocument();
  });

  it("link expired: shows auth.linkExpired with Send a new link", () => {
    render(<LinkExpiredForm type="signup" action={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(c.linkExpired);
    expect(screen.getByRole("button", { name: c.sendNewLink })).toBeInTheDocument();
  });
});
