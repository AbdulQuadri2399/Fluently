import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { emailText, normalise, quoteFound } from "@/lib/audit/quoteCheck";

// The quote check (AC31.7, 04 D39): a finding's quote must appear in the email.
const html = readFileSync("fixtures/emails/welcome.html", "utf8");
const text = emailText({
  subject: "Welcome to Examplebank",
  preheader: "Your made-up account is ready. Two quick steps left.",
  html,
});

describe("quote check", () => {
  it("finds words the email really says, in the body, subject and preheader", () => {
    expect(quoteFound("Verify my identity", text)).toBe(true);
    expect(quoteFound("Welcome to Examplebank", text)).toBe(true);
    expect(quoteFound("Two quick steps left", text)).toBe(true);
  });

  it("ignores case, curly quotes, extra spaces and invisible characters", () => {
    expect(quoteFound("  VERIFY   my identity ", text)).toBe(true);
    expect(quoteFound("Verify​ my identity", text)).toBe(true);
    expect(normalise("It’s “fine” — really")).toBe('it\'s "fine" - really');
  });

  it("rejects words the email never says", () => {
    expect(quoteFound("Claim your free gift today", text)).toBe(false);
    expect(quoteFound("Verify my identity now or lose your account", text)).toBe(false);
  });

  it("does not count code, styles or hidden markup as the email's words", () => {
    const sneaky = emailText({
      subject: "Hi",
      html: "<style>.secret{content:'buy now cheap'}</style><script>var x='act fast'</script><p>Hello</p>",
    });
    expect(quoteFound("buy now cheap", sneaky)).toBe(false);
    expect(quoteFound("act fast", sneaky)).toBe(false);
    expect(quoteFound("Hello", sneaky)).toBe(true);
  });

  it("separates words that sit in different table cells", () => {
    const t = emailText({
      subject: "S",
      html: "<table><tr><td>Save</td><td>20% today</td></tr></table>",
    });
    expect(quoteFound("Save 20% today", t)).toBe(true);
    expect(quoteFound("Save20% today", t)).toBe(false);
  });

  it("allows an ellipsis to skip words, in order", () => {
    expect(quoteFound("Welcome ... Examplebank", text)).toBe(true);
    expect(quoteFound("Verify my identity ... remind me later", text)).toBe(true);
    expect(quoteFound("remind me later ... Verify my identity", text)).toBe(false);
  });

  it("rejects an empty or tiny quote as proof", () => {
    expect(quoteFound("", text)).toBe(false);
    expect(quoteFound("a", text)).toBe(false);
    expect(quoteFound("...", text)).toBe(false);
  });
});
