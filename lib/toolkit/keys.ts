import type { ParsedPrinciple } from "./parse";

/**
 * AC33.5: when a file has no ID column, IDs are generated in sheet order, so a re-ordered sheet
 * would shuffle them. A principle whose name matches one in the previous version keeps that ID;
 * new names get the next free number. Connections are renamed to match.
 */
export function keepKeysByName(
  principles: ParsedPrinciple[],
  relations: { from: string; to: string }[],
  previous: { principle_key: string; name: string }[],
): { principles: ParsedPrinciple[]; relations: { from: string; to: string }[] } {
  const norm = (n: string) => n.toLowerCase().replace(/\s+/g, " ").trim();
  const known = new Map(previous.map((p) => [norm(p.name), p.principle_key]));
  const used = new Set(previous.map((p) => p.principle_key));
  const number = (k: string) => Number(/^P(\d+)$/.exec(k)?.[1] ?? 0);
  let next = Math.max(0, ...previous.map((p) => number(p.principle_key)));
  const renamed = new Map<string, string>();
  for (const p of principles) {
    const match = known.get(norm(p.name));
    renamed.set(p.principle_key, match ?? "");
  }
  for (const p of principles) {
    if (!renamed.get(p.principle_key)) {
      do next += 1;
      while (used.has(`P${String(next).padStart(3, "0")}`));
      renamed.set(p.principle_key, `P${String(next).padStart(3, "0")}`);
    }
  }
  return {
    principles: principles.map((p) => ({ ...p, principle_key: renamed.get(p.principle_key)! })),
    relations: relations.map((r) => ({
      from: renamed.get(r.from) ?? r.from,
      to: renamed.get(r.to) ?? r.to,
    })),
  };
}
