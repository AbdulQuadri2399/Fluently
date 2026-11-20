import { FOLD_PX, isAboveFold, linkKey, PHONE_WIDTH } from "./fold";
import type { EmailParts } from "./parts";

// What the code measures about an email (AC31.5, 04 D37, D39): contrast, colours, button size and
// position, images, preheader, length. Exact numbers from the browser's own layout, never from the
// model. The browser supplies raw values (RawLink, RawText); everything else is calculated here.

export type RawLink = {
  text: string;
  href: string | null;
  top: number;
  /** The link's own box, and the box of the button it sits in (the nearest ancestor whose colour differs). */
  width: number;
  height: number;
  boxWidth: number;
  boxHeight: number;
  color: string;
  bg: string;
  fontSize: number;
  fontWeight: number;
};
export type RawText = {
  snippet: string;
  color: string;
  bg: string;
  fontSize: number;
  fontWeight: number;
  chars: number;
};

type Rgba = { r: number; g: number; b: number; a: number };

/** Reads "rgb(…)" / "rgba(…)" as the browser reports colours. */
export function parseColor(css: string): Rgba | null {
  const m = /rgba?\(([^)]+)\)/i.exec(css);
  if (!m) return null;
  const p = m[1]!
    .split(/[,\s/]+/)
    .filter(Boolean)
    .map(Number);
  if (p.length < 3 || p.slice(0, 3).some((n) => !Number.isFinite(n))) return null;
  return { r: p[0]!, g: p[1]!, b: p[2]!, a: p.length > 3 && Number.isFinite(p[3]) ? p[3]! : 1 };
}

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export const luminance = (c: Rgba) =>
  0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);

/** WCAG contrast ratio of text over a background (text colour with some see-through is blended first). */
export function contrastRatio(fg: string, bg: string): number | null {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (!f || !b) return null;
  const blended = {
    r: f.r * f.a + b.r * (1 - f.a),
    g: f.g * f.a + b.g * (1 - f.a),
    b: f.b * f.a + b.b * (1 - f.a),
    a: 1,
  };
  const l1 = luminance(blended);
  const l2 = luminance({ ...b, a: 1 });
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/** WCAG AA: 4.5 for normal text, 3 for large text (24 px, or 18.66 px and bold). */
export function passesAA(ratio: number, fontSize: number, fontWeight: number): boolean {
  const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
  return ratio >= (large ? 3 : 4.5);
}

export const toHex = (css: string): string | null => {
  const c = parseColor(css);
  if (!c) return null;
  return "#" + [c.r, c.g, c.b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
};

/** Smallest comfortable tap target on a phone, in phone pixels (Apple's 44 pt guideline). */
export const TAP_TARGET_PX = 44;

export type MeasuredLink = {
  text: string;
  href: string | null;
  kind: "button" | "link";
  primary: boolean;
  /** Where it starts, in phone pixels from the top. */
  top: number;
  aboveFold: boolean;
  /** Size of the button (or the link), in phone pixels. */
  width: number;
  height: number;
  tapTargetOk: boolean;
  contrast: { ratio: number; passes: boolean } | null;
};

export type Measured = {
  /** Whether the email's own images were let in for this render. */
  imagesOn: boolean;
  layoutWidth: number;
  /** False when the email laid out wider than a phone, so it is shrunk to fit (a finding). */
  responsive: boolean;
  /** Phone pixels per layout pixel: 1 for a responsive email, less when it was shrunk to fit. */
  zoom: number;
  fullHeight: number;
  foldPx: number;
  links: MeasuredLink[];
  textContrast: {
    samples: number;
    failing: number;
    lowest: { ratio: number; snippet: string } | null;
  };
  colours: { text: string[]; background: string[] };
  images: { count: number; withoutAlt: number };
  preheader: { present: boolean; length: number };
  words: number;
};

const top3 = (counts: Map<string, number>) =>
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

export function computeMeasured(input: {
  links: RawLink[];
  texts: RawText[];
  parts: EmailParts;
  layoutWidth: number;
  fullHeight: number;
  imagesOn: boolean;
  /** Width of the phone the render was fitted to. */
  width?: number;
}): Measured {
  const width = input.width ?? PHONE_WIDTH;
  const responsive = input.layoutWidth <= width + 1;
  const zoom = responsive ? 1 : width / input.layoutWidth;
  const byKey = new Map(input.links.map((l) => [linkKey(l.text, l.href), l]));

  const wanted = [
    ...input.parts.ctas.map((c) => ({ ...c })),
    ...(input.parts.links ?? []).map((l) => ({ ...l, kind: "link" as const, primary: false })),
  ];
  const links: MeasuredLink[] = [];
  for (const w of wanted) {
    const raw = byKey.get(linkKey(w.text, w.href));
    if (!raw) continue;
    const isButton = w.kind === "button";
    const bw = (isButton ? raw.boxWidth : raw.width) * zoom;
    const bh = (isButton ? raw.boxHeight : raw.height) * zoom;
    const ratio = contrastRatio(raw.color, raw.bg);
    const top = raw.top * zoom;
    links.push({
      text: w.text,
      href: w.href,
      kind: w.kind,
      primary: w.primary,
      top: Math.round(top),
      aboveFold: isAboveFold(top),
      width: Math.round(bw),
      height: Math.round(bh),
      tapTargetOk: Math.min(bw, bh) >= TAP_TARGET_PX,
      contrast:
        ratio === null
          ? null
          : { ratio, passes: passesAA(ratio, raw.fontSize * zoom, raw.fontWeight) },
    });
  }

  let failing = 0;
  let lowest: { ratio: number; snippet: string } | null = null;
  const textColours = new Map<string, number>();
  const bgColours = new Map<string, number>();
  let samples = 0;
  for (const t of input.texts) {
    const ratio = contrastRatio(t.color, t.bg);
    const fg = toHex(t.color);
    const bg = toHex(t.bg);
    if (fg) textColours.set(fg, (textColours.get(fg) ?? 0) + t.chars);
    if (bg) bgColours.set(bg, (bgColours.get(bg) ?? 0) + t.chars);
    if (ratio === null) continue;
    samples += 1;
    if (!passesAA(ratio, t.fontSize * zoom, t.fontWeight)) failing += 1;
    if (!lowest || ratio < lowest.ratio) lowest = { ratio, snippet: t.snippet };
  }

  return {
    imagesOn: input.imagesOn,
    layoutWidth: input.layoutWidth,
    responsive,
    zoom: Math.round(zoom * 1000) / 1000,
    fullHeight: Math.round(input.fullHeight * zoom),
    foldPx: FOLD_PX,
    links,
    textContrast: { samples, failing, lowest },
    colours: { text: top3(textColours), background: top3(bgColours) },
    images: {
      count: input.parts.images.length,
      withoutAlt: input.parts.images.filter((i) => !i.alt).length,
    },
    preheader: {
      present: input.parts.preheader !== null,
      length: input.parts.preheader?.length ?? 0,
    },
    words: input.parts.wordCount,
  };
}
