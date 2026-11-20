import { HTMLElement, parse, type Node, TextNode } from "node-html-parser";

// Splits an email into the named parts the audit works on (AC31.3, 04 D37): subject line,
// preheader, hero, body, calls to action (CTAs) and footer. Pure and deterministic: no model,
// no network. The "hero" here is the opening block; the real first phone screen comes from the
// render (P1.5).

/** A call to action: a link designed as a button, or (when the email has no styled button) a short text link standing in. */
export type Cta = { text: string; href: string | null; primary: boolean; kind: "button" | "link" };
/** Any other meaningful link: a plain link in the copy, not designed as a button. */
export type PlainLink = { text: string; href: string | null };
export type EmailImage = { alt: string | null; src: string | null };

export type EmailParts = {
  subject: string;
  /** Hidden preview text at the top of the email; null when there is none (a finding, AC31.3). */
  preheader: string | null;
  hero: { headline: string | null; hasImage: boolean; imageAlt: string | null; text: string };
  body: { text: string; wordCount: number };
  ctas: Cta[];
  links: PlainLink[];
  footer: { text: string; hasUnsubscribe: boolean };
  images: EmailImage[];
  /** All visible text, in order. What quotes are checked against (AC31.7). */
  text: string;
  wordCount: number;
};

const HIDDEN_STYLE =
  /display\s*:\s*none|visibility\s*:\s*hidden|max-height\s*:\s*0|mso-hide\s*:\s*all|opacity\s*:\s*0(?![.\d])|font-size\s*:\s*0(?![.\d])/i;
const FOOTER_WORDS =
  /unsubscribe|opt[- ]?out|all rights reserved|©|privacy policy|view (this email )?in (your )?browser|manage (your )?(preferences|subscription)/i;
const SKIP_LINK =
  /unsubscribe|opt[- ]?out|view (this email )?in (your )?browser|privacy|terms|preferences/i;
const BUTTON_STYLE =
  /background(-color)?\s*:\s*(?!none|transparent|#fff\b|#ffffff\b|white)|border-radius\s*:/i;
const BUTTON_CLASS = /\b(btn|button|cta)\b/i;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const words = (s: string) => (s ? s.split(/\s+/).filter(Boolean).length : 0);

function isHidden(el: HTMLElement): boolean {
  const style = el.getAttribute("style") ?? "";
  const cls = el.getAttribute("class") ?? "";
  if (el.getAttribute("hidden") !== undefined && el.hasAttribute("hidden")) return true;
  if (HIDDEN_STYLE.test(style)) return true;
  return /\b(preheader|preview-text|preview)\b/i.test(cls) && HIDDEN_STYLE.test(style + " " + cls);
}

/** Visible text blocks in reading order, each with the element they came from. */
function blocks(root: HTMLElement): { text: string; el: HTMLElement }[] {
  const out: { text: string; el: HTMLElement }[] = [];
  const walk = (node: Node) => {
    if (node instanceof TextNode) {
      const t = clean(node.text);
      if (t && node.parentNode instanceof HTMLElement) out.push({ text: t, el: node.parentNode });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName?.toLowerCase();
    if (tag === "script" || tag === "style" || tag === "head" || tag === "title") return;
    if (isHidden(node)) return;
    node.childNodes.forEach(walk);
  };
  root.childNodes.forEach(walk);
  return out;
}

function looksLikeButton(a: HTMLElement): boolean {
  const own = a.getAttribute("style") ?? "";
  if (BUTTON_STYLE.test(own) || BUTTON_CLASS.test(a.getAttribute("class") ?? "")) return true;
  if (a.getAttribute("role") === "button") return true;
  // Bulletproof buttons: the link sits in a cell or wrapper that carries the colour.
  let p: HTMLElement | null = a.parentNode as HTMLElement | null;
  for (let i = 0; i < 3 && p; i += 1, p = p.parentNode as HTMLElement | null) {
    const style = p.getAttribute?.("style") ?? "";
    const bg = p.getAttribute?.("bgcolor");
    if ((bg && !/^(#fff(fff)?|white)$/i.test(bg)) || BUTTON_STYLE.test(style)) return true;
    if (BUTTON_CLASS.test(p.getAttribute?.("class") ?? "")) return true;
  }
  return false;
}

export function splitEmail(html: string, subject: string): EmailParts {
  const root = parse(html, { blockTextElements: { script: false, style: false } });

  // Preheader: the first hidden text near the top (class names like "preheader" help).
  let preheader: string | null = null;
  for (const el of root.querySelectorAll("*")) {
    if (!isHidden(el)) continue;
    const t = clean(el.text);
    if (t) {
      preheader = t;
      break;
    }
  }

  const all = blocks(root);
  const ctas: Cta[] = [];
  const links = root.querySelectorAll("a").filter((a) => a.getAttribute("href"));
  const linkText = (a: HTMLElement) =>
    clean(a.text) || clean(a.querySelector("img")?.getAttribute("alt") ?? "");
  const candidates = links.filter(
    (a) => linkText(a) && !SKIP_LINK.test(linkText(a) + " " + (a.getAttribute("href") ?? "")),
  );
  const styled = candidates.filter(looksLikeButton);
  // No styled buttons: short text links stand in as the calls to action.
  const chosen = styled.length ? styled : candidates.filter((a) => words(linkText(a)) <= 6);
  const kind: Cta["kind"] = styled.length ? "button" : "link";
  const seen = new Set<string>();
  const keyOf = (a: HTMLElement) => `${linkText(a)}|${a.getAttribute("href")}`;
  for (const a of chosen) {
    if (seen.has(keyOf(a))) continue;
    seen.add(keyOf(a));
    ctas.push({
      text: linkText(a),
      href: a.getAttribute("href") ?? null,
      primary: ctas.length === 0,
      kind,
    });
  }
  const plainLinks: PlainLink[] = [];
  for (const a of candidates) {
    if (seen.has(keyOf(a))) continue;
    seen.add(keyOf(a));
    plainLinks.push({ text: linkText(a), href: a.getAttribute("href") ?? null });
  }

  const images: EmailImage[] = root.querySelectorAll("img").map((img) => ({
    alt: img.getAttribute("alt")?.trim() || null,
    src: img.getAttribute("src") ?? null,
  }));

  // Where the first call to action sits among the text blocks; the hero is everything before it.
  const firstCta = ctas[0]?.text ?? null;
  const ctaIndex = firstCta ? all.findIndex((b) => b.text === firstCta) : -1;
  const lastCtaText = ctas.at(-1)?.text ?? null;
  const lastCtaIndex = lastCtaText ? all.map((b) => b.text).lastIndexOf(lastCtaText) : -1;

  // Footer: from the first footer-looking block after the last call to action (or the last half).
  const footerFrom = all.findIndex(
    (b, i) =>
      i > Math.max(lastCtaIndex, Math.floor(all.length / 2) - 1) && FOOTER_WORDS.test(b.text),
  );
  const footerBlocks = footerFrom < 0 ? [] : all.slice(footerFrom);
  const bodyEnd = footerFrom < 0 ? all.length : footerFrom;

  const heroEnd = ctaIndex >= 0 ? Math.min(ctaIndex, 3) : Math.min(2, bodyEnd);
  const heroBlocks = all.slice(0, Math.max(1, Math.min(heroEnd, bodyEnd)));
  const heading = root.querySelector("h1, h2, h3");
  const headline = heading ? clean(heading.text) || null : (heroBlocks[0]?.text ?? null);
  const heroImage = root.querySelector("img");
  const ctaTexts = new Set(ctas.map((c) => c.text));
  const bodyBlocks = all.slice(heroBlocks.length, bodyEnd).filter((b) => !ctaTexts.has(b.text));

  const text = all.map((b) => b.text).join("\n");
  const bodyText = bodyBlocks.map((b) => b.text).join("\n");
  return {
    subject: clean(subject),
    preheader,
    hero: {
      headline,
      hasImage: Boolean(heroImage),
      imageAlt: heroImage?.getAttribute("alt")?.trim() || null,
      text: heroBlocks.map((b) => b.text).join("\n"),
    },
    body: { text: bodyText, wordCount: words(bodyText) },
    ctas,
    links: plainLinks,
    footer: {
      text: footerBlocks.map((b) => b.text).join("\n"),
      hasUnsubscribe:
        /unsubscribe|opt[- ]?out/i.test(footerBlocks.map((b) => b.text).join(" ")) ||
        links.some(
          (a) =>
            /unsubscribe|opt[- ]?out/i.test(a.getAttribute("href") ?? "") ||
            /unsubscribe/i.test(a.text),
        ),
    },
    images,
    text,
    wordCount: words(text),
  };
}
