/**
 * The fold (AC31.3b): the first phone screen of an email, taken as the first 650 px at phone width.
 * Positions come from the browser's own layout of the email (the preview now; the audit's render
 * later, P1.5). With images off, blocked images take no space, so this is an estimate.
 */
export const FOLD_PX = 650;
export const PHONE_WIDTH = 375;

export type LinkPosition = { top: number };

/** A link counts as above the fold when it starts inside the first phone screen. */
export const isAboveFold = (top: number) => top < FOLD_PX;

export const linkKey = (text: string, href: string | null) =>
  `${text.replace(/\s+/g, " ").trim()}|${href ?? ""}`;

/** Where each link starts, from the email's laid-out document. Matches by text and address. */
export function measureLinks(
  doc: Document,
  wanted: { text: string; href: string | null }[],
): Record<string, LinkPosition> {
  const out: Record<string, LinkPosition> = {};
  const anchors = Array.from(doc.querySelectorAll("a"));
  for (const w of wanted) {
    const key = linkKey(w.text, w.href);
    const a = anchors.find((el) => {
      const text =
        (el.textContent ?? "").trim() || el.querySelector("img")?.getAttribute("alt") || "";
      return linkKey(text, el.getAttribute("href")) === key;
    });
    if (!a) continue;
    const rect = a.getBoundingClientRect();
    out[key] = { top: rect.top + (doc.defaultView?.scrollY ?? 0) };
  }
  return out;
}
