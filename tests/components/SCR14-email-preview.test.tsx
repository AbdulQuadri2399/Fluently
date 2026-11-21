import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  EmailExpanded,
  EmailPreviewBody,
  EmailPreviewDialog,
} from "@/components/email/EmailPreview";
import { emailCopy as c } from "@/components/email/copy";
import { FOLD_PX } from "@/lib/email/fold";
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
    expect(f.getAttribute("sandbox")).toBe("allow-same-origin");
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
    // The subject shows above the preview and again as the phone's mail header.
    expect(screen.getAllByText("Welcome to Examplebank", { selector: "p" })).toHaveLength(2);
    expect(screen.getByTestId("phone-frame")).toBeInTheDocument();
    expect(frame().style.width).toBe("375px");
    expect(frame().style.height).toBe("580px");
  });
});

describe("buttons, links and the fold (AC31.3b)", () => {
  const tall = () => {
    const parts = splitEmail(html, "Welcome to Examplebank");
    return { ...data(), parts };
  };

  it("says which is designed as a button and which is a plain link", async () => {
    render(<EmailExpanded load={async () => tall()} />);
    const button = (await screen.findByText("Verify my identity")).closest("li")!;
    expect(button).toHaveTextContent(c.parts.kindButton);
    expect(button).toHaveTextContent(c.parts.primary);
    const link = screen.getByText("remind me later").closest("li")!;
    expect(link).toHaveTextContent(c.parts.kindLink);
    expect(link).not.toHaveTextContent(c.parts.kindButton);
  });

  it("once the email is laid out, each link says above or below the fold; the fold line is drawn", async () => {
    const measure = vi.fn(() => ({
      "Verify my identity|https://example.org/verify": { top: 420 },
      "remind me later|https://example.org/later": { top: 900 },
    }));
    render(<EmailPreviewBody data={tall()} width={256} measure={measure} />);
    expect(screen.queryByText(c.parts.aboveFold)).not.toBeInTheDocument();
    fireEvent.load(frame());
    expect(await screen.findByText(c.parts.aboveFold)).toBeInTheDocument();
    expect(screen.getByText(c.parts.belowFold)).toBeInTheDocument();
    expect(screen.getByText("Verify my identity").closest("li")).toHaveTextContent(
      c.parts.aboveFold,
    );
    expect(screen.getByText("remind me later").closest("li")).toHaveTextContent(c.parts.belowFold);
    // The fold line is drawn inside the email document, so it scrolls with the email.
    expect(frame().getAttribute("srcdoc")).toContain("data-fold");
    expect(frame().getAttribute("srcdoc")).toContain(`top:${FOLD_PX}px`);
    expect(screen.getByText(c.preview.foldNote)).toBeInTheDocument();
  });

  it("with images on, the fold note no longer calls it an estimate", async () => {
    render(<EmailPreviewBody data={tall()} width={256} measure={() => ({})} />);
    await userEvent.click(screen.getByLabelText(new RegExp(c.preview.loadImages)));
    expect(screen.getByText(c.preview.foldNoteOn)).toBeInTheDocument();
  });
});
