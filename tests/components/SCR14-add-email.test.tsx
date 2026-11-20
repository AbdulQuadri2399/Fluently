import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddEmailDialog } from "@/components/email/AddEmailDialog";
import { EmailPartsSection } from "@/components/email/EmailPartsSection";
import { emailCopy as c } from "@/components/email/copy";
import { cardView } from "@/lib/canvas/card";
import type { TreeNode } from "@/lib/canvas/load";
import { splitEmail } from "@/lib/email/parts";
import { readFileSync } from "node:fs";

// Add an email (AC31.2), the email card and its parts (AC31.3).
function open(over: Partial<Parameters<typeof AddEmailDialog>[0]["fns"]> = {}) {
  const fns = {
    addPaste: vi.fn(async () => ({ ok: true as const, data: { id: "e1" } })),
    addFile: vi.fn(async () => ({ ok: true as const, data: { id: "e2" } })),
    ...over,
  };
  const onAdded = vi.fn();
  const onOpenChange = vi.fn();
  render(<AddEmailDialog open onOpenChange={onOpenChange} fns={fns} onAdded={onAdded} />);
  return { fns, onAdded, onOpenChange };
}
const file = (name: string, body = "x") => new File([body], name, { type: "text/html" });

describe("Add email dialog", () => {
  it("paste: needs a subject line and the HTML, then adds", async () => {
    const { fns, onAdded } = open();
    await userEvent.click(screen.getByRole("button", { name: c.submit }));
    expect(screen.getByRole("alert")).toHaveTextContent(c.subjectNeeded);
    await userEvent.type(screen.getByLabelText(c.subjectLabel), "Welcome to Examplebank");
    await userEvent.click(screen.getByRole("button", { name: c.submit }));
    expect(screen.getByRole("alert")).toHaveTextContent(c.htmlNeeded);
    await userEvent.type(screen.getByLabelText(c.htmlLabel), "<p>Hi</p>");
    await userEvent.click(screen.getByRole("button", { name: c.submit }));
    expect(fns.addPaste).toHaveBeenCalledWith("Welcome to Examplebank", "<p>Hi</p>");
    await waitFor(() => expect(onAdded).toHaveBeenCalled());
  });

  it("file: an .eml needs no subject line; an .html file does", async () => {
    const { fns } = open();
    await userEvent.click(screen.getByRole("button", { name: c.tabFile }));
    expect(screen.getByText(c.subjectHelp)).toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText(c.fileLabel), file("offer.html"));
    await userEvent.click(screen.getByRole("button", { name: c.submit }));
    expect(screen.getByRole("alert")).toHaveTextContent(c.subjectNeeded);
    expect(fns.addFile).not.toHaveBeenCalled();
    await userEvent.upload(screen.getByLabelText(c.fileLabel), file("sale.eml"));
    await userEvent.click(screen.getByRole("button", { name: c.submit }));
    await waitFor(() => expect(fns.addFile).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fns.addFile).mock.calls[0]![0]).toMatchObject({ name: "sale.eml" });
  });

  it("file: nothing chosen, or the wrong kind of file, says so", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: c.tabFile }));
    await userEvent.click(screen.getByRole("button", { name: c.submit }));
    expect(screen.getByRole("alert")).toHaveTextContent(c.fileNeeded);
    await userEvent.upload(screen.getByLabelText(c.fileLabel), file("notes.txt"), {
      applyAccept: false,
    });
    await userEvent.click(screen.getByRole("button", { name: c.submit }));
    expect(screen.getByRole("alert")).toHaveTextContent(c.fileType);
  });

  it("explains a full project and a failed save", async () => {
    const { fns } = open({
      addPaste: vi.fn(async () => ({ ok: false as const, code: "too_many" as const })),
    });
    await userEvent.type(screen.getByLabelText(c.subjectLabel), "S");
    await userEvent.type(screen.getByLabelText(c.htmlLabel), "x");
    await userEvent.click(screen.getByRole("button", { name: c.submit }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.tooMany);
    vi.mocked(fns.addPaste).mockResolvedValueOnce({ ok: false, code: "unavailable" });
    await userEvent.click(screen.getByRole("button", { name: c.submit }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(c.failed));
  });
});

describe("email card and parts", () => {
  const node = (data: Record<string, unknown>): TreeNode => ({
    id: "n1",
    type: "email",
    stage: "intake",
    title: "Welcome to Examplebank",
    data,
    status: "ok",
    stale: false,
    lowSpecificity: false,
    provenance: "human",
    model: null,
    sortOrder: 0,
    createdAt: "2026-11-20T10:00:00Z",
    stageRunId: null,
    version: 1,
    updatedByName: "",
    confidence: null,
  });

  it("the card says how many buttons and whether there's a preheader", () => {
    expect(cardView(node({ buttons: 1, hasPreheader: true }), false).status).toBe(
      "1 button · preheader",
    );
    expect(cardView(node({ buttons: 3, hasPreheader: false }), false).status).toBe(
      "3 buttons · no preheader",
    );
    expect(cardView(node({ buttons: 0, hasPreheader: false }), false).typeLabel).toBe("Email");
  });

  it("the details panel lists the parts, and says what's missing", () => {
    const parts = splitEmail(
      readFileSync("fixtures/emails/welcome.html", "utf8"),
      "Welcome to Examplebank",
    );
    const { rerender } = render(
      <EmailPartsSection detail={{ id: "e1", source: "paste", parts, imagesLoaded: false }} />,
    );
    const region = screen.getByRole("region", { name: c.parts.title });
    expect(region).toHaveTextContent("Welcome to Examplebank");
    expect(region).toHaveTextContent("Your made-up account is ready.");
    expect(region).toHaveTextContent("Verify my identity");
    expect(region).toHaveTextContent(c.parts.unsubscribe);
    expect(region).toHaveTextContent(c.parts.imagesCount(1, 0));
    rerender(
      <EmailPartsSection
        detail={{
          id: "e2",
          source: "paste",
          parts: splitEmail("<p>No frills</p>", "Plain"),
          imagesLoaded: false,
        }}
      />,
    );
    const bare = screen.getByRole("region", { name: c.parts.title });
    expect(bare).toHaveTextContent(c.parts.noPreheader);
    expect(bare).toHaveTextContent(c.parts.noButtons);
    expect(bare).toHaveTextContent(c.parts.noUnsubscribe);
  });
});
