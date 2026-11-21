import { describe, expect, it } from "vitest";
import { previewDocument } from "@/lib/email/preview";

// The email preview page (04 D38): a content rule blocks the network unless images are on.
describe("previewDocument", () => {
  const meta = (doc: string) => /Content-Security-Policy" content="([^"]*)"/.exec(doc)?.[1] ?? "";

  it("blocks everything from the network by default, including images", () => {
    const rule = meta(previewDocument("<p>Hi</p>", { images: false }));
    expect(rule).toContain("default-src 'none'");
    expect(rule).toContain("img-src data:");
    expect(rule).not.toContain("https:");
    expect(rule).toContain("style-src 'unsafe-inline'");
  });

  it("images on: only https images are allowed, and nothing else opens up", () => {
    const rule = meta(previewDocument("<p>Hi</p>", { images: true }));
    expect(rule).toContain("img-src data: https:");
    expect(rule).toContain("default-src 'none'");
    expect(rule).not.toMatch(/script-src|connect-src|frame-src/);
  });

  it("goes in the head, so a full email keeps its own document and styles", () => {
    const html =
      "<!doctype html><html><head><style>p{color:red}</style></head><body><p>Hi</p></body></html>";
    const doc = previewDocument(html, { images: false });
    expect(doc.indexOf("Content-Security-Policy")).toBeLessThan(doc.indexOf("<style>"));
    expect(doc.startsWith("<!doctype html>")).toBe(true);
    expect(doc).toContain("<p>Hi</p>");
  });

  it("an email with <html> but no head gets one; a bare fragment is wrapped", () => {
    expect(previewDocument("<html><body>Hi</body></html>", { images: false })).toMatch(
      /<html><head><meta http-equiv="Content-Security-Policy"/,
    );
    const fragment = previewDocument("<h1>Hi</h1>", { images: false });
    expect(fragment).toMatch(
      /^<!doctype html><html><head><meta http-equiv="Content-Security-Policy"/,
    );
    expect(fragment).toContain("<body><h1>Hi</h1></body>");
  });

  it("the rule comes before anything that could load", () => {
    const doc = previewDocument(
      '<head><link rel="stylesheet" href="https://x.test/a.css"></head><img src="https://x.test/p.gif">',
      {
        images: false,
      },
    );
    expect(doc.indexOf("Content-Security-Policy")).toBeLessThan(
      doc.indexOf("https://x.test/a.css"),
    );
  });

  it("asks for the phone's width, whatever shape the email has", () => {
    for (const html of [
      "<p>Hi</p>",
      "<html><body>Hi</body></html>",
      "<html><head></head><body>Hi</body></html>",
    ])
      expect(previewDocument(html, { images: false })).toContain(
        'name="viewport" content="width=device-width',
      );
  });

  it("draws a fold line that scrolls with the email, only when asked", () => {
    const plain = previewDocument("<p>Hi</p>", { images: false });
    expect(plain).not.toContain("data-fold");
    const withFold = previewDocument("<html><body><p>Hi</p></body></html>", {
      images: false,
      foldAt: 580,
      foldLabel: "Fold",
    });
    expect(withFold).toContain("data-fold");
    expect(withFold).toContain("top:580px");
    expect(withFold).toContain(">Fold</span>");
    // Still no scripts, and the network is still blocked.
    expect(withFold).not.toContain("<script");
    expect(meta(withFold)).toContain("default-src 'none'");
  });
});
