import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { splitEmail } from "@/lib/email/parts";
import { parseEml } from "@/lib/uploads/eml";

// Email parts (AC31.3, 04 D37): subject, preheader, hero, body, CTAs, footer.
const welcome = () =>
  splitEmail(readFileSync("fixtures/emails/welcome.html", "utf8"), "Welcome to Examplebank");

describe("email parts", () => {
  it("finds the hidden preheader, and says when there isn't one", () => {
    expect(welcome().preheader).toBe("Your made-up account is ready. Two quick steps left.");
    expect(
      splitEmail("<html><body><h1>Hi</h1><p>Text</p></body></html>", "S").preheader,
    ).toBeNull();
  });

  it("keeps hidden text out of the visible text that quotes are checked against", () => {
    expect(welcome().text).not.toContain("Two quick steps left");
    expect(welcome().text).toContain("Thanks for joining.");
  });

  it("finds the styled button as the primary call to action, then the text link", () => {
    const ctas = welcome().ctas;
    expect(ctas[0]).toEqual({
      text: "Verify my identity",
      href: "https://example.org/verify",
      primary: true,
    });
    expect(ctas.map((c) => c.text)).toEqual(["Verify my identity"]);
  });

  it("with no styled buttons, short text links stand in; unsubscribe and privacy links never do", () => {
    const eml = parseEml(readFileSync("fixtures/emails/plain-links.eml", "utf8"));
    const parts = splitEmail(eml.html!, eml.subject);
    expect(parts.ctas.map((c) => c.text)).toEqual(["Shop the sale"]);
    expect(parts.footer.hasUnsubscribe).toBe(true);
  });

  it("hero is the opening block: headline and image", () => {
    const hero = welcome().hero;
    expect(hero.headline).toBe("Welcome to Examplebank");
    expect(hero.hasImage).toBe(true);
    expect(hero.imageAlt).toBe("A smiling invented customer");
  });

  it("footer starts at the first footer-looking text after the last call to action", () => {
    const parts = welcome();
    expect(parts.footer.text).toContain("© 2026 Examplebank");
    expect(parts.footer.hasUnsubscribe).toBe(true);
    expect(parts.body.text).not.toContain("Examplebank Ltd");
    expect(parts.body.text).toContain("It takes about five minutes");
  });

  it("counts words and lists images with their descriptions", () => {
    const parts = welcome();
    expect(parts.wordCount).toBeGreaterThan(40);
    expect(parts.body.wordCount).toBeGreaterThan(20);
    expect(parts.images).toEqual([
      { alt: "A smiling invented customer", src: "https://example.org/hero.png" },
    ]);
  });

  it(".eml: subject is decoded and the HTML body is found", () => {
    const eml = parseEml(readFileSync("fixtures/emails/plain-links.eml", "utf8"));
    expect(eml.subject).toBe("Don't miss out on 20% off");
    expect(splitEmail(eml.html!, eml.subject).hero.headline).toBe("20% off, today only");
  });

  it("never throws on odd input", () => {
    expect(() => splitEmail("", "")).not.toThrow();
    expect(() => splitEmail("<<<not html", "S")).not.toThrow();
    expect(splitEmail("", "").ctas).toEqual([]);
  });
});
