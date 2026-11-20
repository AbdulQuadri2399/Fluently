import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmailExpanded, EmailPreviewDialog } from "@/components/email/EmailPreview";
import { emailCopy as c } from "@/components/email/copy";
import { splitEmail } from "@/lib/email/parts";
import type { EmailPreviewData } from "@/lib/email/service";
import { readFileSync } from "node:fs";

// Email preview (expanded card and the brief's Preview), safe by default.
const html = readFileSync("fixtures/emails/welcome.html", "utf8");
const data = (): EmailPreviewData => ({
  id: "e1",
  subject: "Welcome to Examplebank",
  html,
  parts: splitEmail(html, "Welcome to Examplebank"),
});
const frame = () =>
  screen.getByTitle(c.preview.frameTitle("Welcome to Examplebank")) as HTMLIFrameElement;

describe("expanded email card", () => {
  it("shows the preheader and buttons, then a sandboxed phone-width preview", async () => {
    render(<EmailExpanded load={async () => data()} />);
    expect(screen.getByText(c.preview.loading)).toBeInTheDocument();
    expect(
      await screen.findByText("Your made-up account is ready. Two quick steps left."),
    ).toBeInTheDocument();
    expect(screen.getByText("Verify my identity")).toBeInTheDocument();
    expect(screen.getByText(c.parts.primary, { exact: false })).toBeInTheDocument();
    const f = frame();
    expect(f.getAttribute("sandbox")).toBe("");
    expect(f.getAttribute("srcdoc")).toContain("Welcome to Examplebank");
    expect(f.getAttribute("srcdoc")).toContain("default-src 'none'");
    expect(f.style.width).toBe("375px");
    expect(screen.getByText(c.preview.note)).toBeInTheDocument();
  });

  it("images are off, and the switch lets https images in (with a warning)", async () => {
    render(<EmailExpanded load={async () => data()} />);
    await screen.findByText(c.preview.imagesOff);
    expect(frame().getAttribute("srcdoc")).toContain("img-src data:;");
    await userEvent.click(screen.getByLabelText(new RegExp(c.preview.loadImages)));
    expect(frame().getAttribute("srcdoc")).toContain("img-src data: https:");
    expect(screen.getByText(c.preview.loadImagesHint)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(new RegExp(c.preview.loadImages)));
    expect(frame().getAttribute("srcdoc")).toContain("img-src data:;");
  });

  it("says when there is no preheader or button", async () => {
    const bare = { ...data(), html: "<p>Plain</p>", parts: splitEmail("<p>Plain</p>", "Plain") };
    render(<EmailExpanded load={async () => bare} />);
    expect(await screen.findByText(c.parts.noPreheader)).toBeInTheDocument();
    expect(screen.getByText(c.parts.noButtons)).toBeInTheDocument();
  });

  it("a preview that can't load says so", async () => {
    render(<EmailExpanded load={async () => null} />);
    expect(await screen.findByText(c.preview.failed)).toBeInTheDocument();
    render(<EmailExpanded load={vi.fn().mockRejectedValue(new Error("x"))} />);
    await waitFor(() => expect(screen.getAllByText(c.preview.failed)).toHaveLength(2));
  });
});

describe("preview dialog (the brief)", () => {
  it("opens the email at full phone width with its subject", async () => {
    render(<EmailPreviewDialog open onOpenChange={() => undefined} load={async () => data()} />);
    expect(await screen.findByRole("dialog", { name: c.preview.title })).toBeInTheDocument();
    expect(screen.getByText("Welcome to Examplebank", { selector: "p" })).toBeInTheDocument();
    expect(frame().style.width).toBe("375px");
  });
});
