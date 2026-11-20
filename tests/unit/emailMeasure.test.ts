import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { splitEmail } from "@/lib/email/parts";
import {
  computeMeasured,
  contrastRatio,
  parseColor,
  passesAA,
  toHex,
  type RawLink,
  type RawText,
} from "@/lib/email/measure";

// What the code measures (AC31.5): contrast, colours, button size and position, images, preheader.
describe("colour and contrast", () => {
  it("reads the browser's colour strings", () => {
    expect(parseColor("rgb(26, 95, 180)")).toEqual({ r: 26, g: 95, b: 180, a: 1 });
    expect(parseColor("rgba(0, 0, 0, 0.5)")).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
    expect(parseColor("transparent")).toBeNull();
    expect(toHex("rgb(26, 95, 180)")).toBe("#1a5fb4");
  });

  it("matches the known contrast ratios", () => {
    expect(contrastRatio("rgb(0, 0, 0)", "rgb(255, 255, 255)")).toBe(21);
    expect(contrastRatio("rgb(255, 255, 255)", "rgb(255, 255, 255)")).toBe(1);
    expect(contrastRatio("rgb(119, 119, 119)", "rgb(255, 255, 255)")).toBe(4.48); // #777 on white
    expect(contrastRatio("rgb(118, 118, 118)", "rgb(255, 255, 255)")).toBe(4.54); // #767676 on white
    expect(contrastRatio("nonsense", "rgb(255, 255, 255)")).toBeNull();
  });

  it("see-through text is blended with what's behind it", () => {
    const solid = contrastRatio("rgb(0, 0, 0)", "rgb(255, 255, 255)")!;
    expect(contrastRatio("rgba(0, 0, 0, 0.5)", "rgb(255, 255, 255)")!).toBeLessThan(solid);
  });

  it("AA: 4.5 for normal text, 3 for large text", () => {
    expect(passesAA(4.48, 16, 400)).toBe(false);
    expect(passesAA(4.54, 16, 400)).toBe(true);
    expect(passesAA(3.2, 24, 400)).toBe(true);
    expect(passesAA(3.2, 19, 700)).toBe(true);
    expect(passesAA(3.2, 19, 400)).toBe(false);
  });
});

describe("computeMeasured", () => {
  const parts = splitEmail(readFileSync("fixtures/emails/welcome.html", "utf8"), "Welcome");
  const link = (over: Partial<RawLink>): RawLink => ({
    text: "Verify my identity",
    href: "https://example.org/verify",
    top: 400,
    width: 120,
    height: 20,
    boxWidth: 200,
    boxHeight: 48,
    color: "rgb(255, 255, 255)",
    bg: "rgb(26, 95, 180)",
    fontSize: 16,
    fontWeight: 400,
    ...over,
  });
  const text = (over: Partial<RawText>): RawText => ({
    snippet: "Thanks for joining.",
    color: "rgb(0, 0, 0)",
    bg: "rgb(255, 255, 255)",
    fontSize: 16,
    fontWeight: 400,
    chars: 20,
    ...over,
  });
  const run = (links: RawLink[], texts: RawText[] = [text({})], extra = {}) =>
    computeMeasured({
      links,
      texts,
      parts,
      layoutWidth: 375,
      fullHeight: 900,
      imagesOn: false,
      ...extra,
    });

  it("a button is measured by the box it sits in; a plain link by itself", () => {
    const m = run([
      link({}),
      link({
        text: "remind me later",
        href: "https://example.org/later",
        top: 900,
        width: 110,
        height: 18,
        boxWidth: 375,
        boxHeight: 40,
        color: "rgb(0, 0, 238)",
        bg: "rgb(255, 255, 255)",
      }),
    ]);
    const [button, plain] = m.links;
    expect(button).toMatchObject({
      kind: "button",
      primary: true,
      aboveFold: true,
      width: 200,
      height: 48,
      tapTargetOk: true,
    });
    expect(button!.contrast).toEqual({ ratio: 6.29, passes: true });
    expect(plain).toMatchObject({
      kind: "link",
      aboveFold: false,
      width: 110,
      height: 18,
      tapTargetOk: false,
    });
  });

  it("flags low contrast on a button and on body text", () => {
    const m = run(
      [link({ color: "rgb(200, 200, 200)", bg: "rgb(255, 255, 255)" })],
      [text({}), text({ snippet: "Pale grey words", color: "rgb(190, 190, 190)", chars: 15 })],
    );
    expect(m.links[0]!.contrast!.passes).toBe(false);
    expect(m.textContrast).toMatchObject({ samples: 2, failing: 1 });
    expect(m.textContrast.lowest!.snippet).toBe("Pale grey words");
  });

  it("the fold is 650 phone pixels", () => {
    const m = run([
      link({ top: 649 }),
      link({ text: "remind me later", href: "https://example.org/later", top: 650 }),
    ]);
    expect(m.links.map((l) => l.aboveFold)).toEqual([true, false]);
    expect(m.foldPx).toBe(650);
  });

  it("an email wider than a phone is shrunk to fit: positions and sizes shrink with it", () => {
    const m = run([link({ top: 800, boxWidth: 300, boxHeight: 60 })], undefined, {
      layoutWidth: 600,
    });
    expect(m.responsive).toBe(false);
    expect(m.zoom).toBe(0.625);
    expect(m.links[0]).toMatchObject({
      top: 500,
      aboveFold: true,
      width: 188,
      height: 38,
      tapTargetOk: false,
    });
    expect(m.fullHeight).toBe(563);
    expect(run([link({})]).responsive).toBe(true);
  });

  it("colours are listed by how much text uses them; links not found in the render are left out", () => {
    const m = run(
      [link({})],
      [
        text({ chars: 100 }),
        text({ color: "rgb(26, 95, 180)", bg: "rgb(251, 251, 250)", chars: 10 }),
      ],
    );
    expect(m.colours.text).toEqual(["#000000", "#1a5fb4"]);
    expect(m.colours.background).toEqual(["#ffffff", "#fbfbfa"]);
    expect(m.links).toHaveLength(1); // the plain link wasn't in the raw list
  });

  it("images, preheader and length come from the email's parts", () => {
    const m = run([link({})]);
    expect(m.images).toEqual({ count: 1, withoutAlt: 0 });
    expect(m.preheader).toEqual({
      present: true,
      length: "Your made-up account is ready. Two quick steps left.".length,
    });
    expect(m.words).toBe(parts.wordCount);
    expect(
      computeMeasured({
        links: [],
        texts: [],
        parts: splitEmail("<p>Hi</p>", "S"),
        layoutWidth: 375,
        fullHeight: 100,
        imagesOn: true,
      }).preheader,
    ).toEqual({ present: false, length: 0 });
  });
});
