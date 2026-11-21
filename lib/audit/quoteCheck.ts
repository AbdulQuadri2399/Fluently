import { parse } from "node-html-parser";

// The quote check (AC31.7, 04 D39): every quote a finding rests on must appear in the email.
// Code does this, never the model. A finding whose quote isn't found is dropped and logged.

/** Lower-case, one kind of quote and dash, one kind of space, no invisible characters. */
export function normalise(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[​-‍⁠﻿­]/g, "")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** The words a person can read in an email: its subject, preheader and visible text. */
export function emailText(input: { subject: string; preheader?: string | null; html: string }) {
  const root = parse(input.html, { blockTextElements: { script: false, style: false } });
  root.querySelectorAll("script, style, head, title").forEach((n) => n.remove());
  // Text next to text with no space between tags (table cells) still reads as separate words.
  const body = root.innerHTML.replace(/<[^>]+>/g, " ");
  const decoded = parse(body).textContent;
  return normalise([input.subject, input.preheader ?? "", decoded].join(" \n "));
}

const MIN_FRAGMENT = 3;

/**
 * True when the quote appears in the text. A quote written with "..." (or an ellipsis) may skip
 * words: each piece must be found, in order. Very short quotes are not accepted as proof.
 */
export function quoteFound(quote: string, haystack: string): boolean {
  const fragments = normalise(quote)
    .split("...")
    .map((f) => f.replace(/^[\s"'.,;:!?-]+|[\s"'.,;:!?-]+$/g, "").trim())
    .filter(Boolean);
  if (!fragments.length || fragments.some((f) => f.length < MIN_FRAGMENT)) return false;
  let at = 0;
  for (const f of fragments) {
    const i = haystack.indexOf(f, at);
    if (i < 0) return false;
    at = i + f.length;
  }
  return true;
}
