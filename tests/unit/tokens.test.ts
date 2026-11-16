import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Contrast checks for every 03b colour pair (03b §3, NFR3).
const css = readFileSync("app/globals.css", "utf8");

function block(selector: RegExp): Record<string, string> {
  const m = css.match(selector);
  if (!m?.[1]) throw new Error(`block not found: ${selector}`);
  const vars: Record<string, string> = {};
  for (const [, name, value] of m[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    if (name && value) vars[name] = value;
  }
  return vars;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r ?? 0) + 0.7152 * f(g ?? 0) + 0.0722 * f(b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const light = block(/:root\s*\{([^}]*)\}/);
const dark = block(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/);

const backgrounds = ["bg", "surface", "surface-2"];
const texts = [
  "text",
  "text-muted",
  "primary",
  "danger",
  "success",
  "warning",
  "node-objectives",
  "node-sources",
  "node-themes",
  "node-opportunities",
  "node-solutions",
  "node-lofi",
  "node-tests",
];

describe.each([
  ["light", light],
  ["dark", dark],
])("%s theme tokens", (_name, vars) => {
  it.each(texts)("%s has ≥ 4.5:1 contrast on bg, surface and surface-2", (t) => {
    for (const b of backgrounds) {
      const fg = vars[t];
      const bg = vars[b];
      expect(fg, `--${t}`).toBeDefined();
      expect(bg, `--${b}`).toBeDefined();
      expect(contrast(fg ?? "", bg ?? "")).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("button text on primary has ≥ 4.5:1", () => {
    expect(
      contrast(vars["primary-foreground"] ?? "", vars["primary"] ?? ""),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("button text on danger has ≥ 4.5:1", () => {
    expect(contrast(vars["danger-foreground"] ?? "", vars["danger"] ?? "")).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});

describe("motion tokens (03b §3)", () => {
  it.each([
    ["duration-fast", "120ms"],
    ["duration-base", "200ms"],
    ["duration-slow", "320ms"],
    ["ease-standard", "cubic-bezier(0.2, 0, 0, 1)"],
    ["ease-exit", "cubic-bezier(0.3, 0, 1, 1)"],
    ["ease-emphasis", "cubic-bezier(0.05, 0.7, 0.1, 1)"],
  ])("--%s is %s", (name, value) => {
    expect(css).toContain(`--${name}: ${value};`);
  });
});
