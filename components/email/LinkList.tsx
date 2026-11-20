import type { EmailParts } from "@/lib/email/parts";
import { isAboveFold, linkKey, type LinkPosition } from "@/lib/email/fold";
import { cn } from "@/lib/utils";
import { emailCopy as c } from "./copy";

const Tag = ({ children, tone }: { children: React.ReactNode; tone?: "ok" | "info" | "warn" }) => (
  <span
    className={cn(
      "rounded-full bg-canvas px-1.5 text-caption whitespace-nowrap text-muted",
      tone === "ok" && "bg-ok-bg text-ok",
      tone === "info" && "bg-info-bg text-info",
      tone === "warn" && "bg-warn-bg text-warn",
    )}
  >
    {children}
  </span>
);

/**
 * Every meaningful link in an email: those designed as buttons (or standing in as the call to
 * action), then plain links; each says which it is, and, once the preview has been laid out,
 * whether it is above the fold (AC31.3b).
 */
export function LinkList({
  parts,
  positions,
}: {
  parts: Pick<EmailParts, "ctas" | "links">;
  positions?: Record<string, LinkPosition>;
}) {
  const rows = [
    ...parts.ctas.map((l) => ({ ...l, kind: l.kind ?? "button", primary: l.primary })),
    ...(parts.links ?? []).map((l) => ({ ...l, kind: "link" as const, primary: false })),
  ];
  if (!rows.length) return <span className="text-muted">{c.parts.noButtons}</span>;
  return (
    <ul className="grid gap-1.5">
      {rows.map((l) => {
        const pos = positions?.[linkKey(l.text, l.href)];
        return (
          <li key={`${l.text}|${l.href}`} className="flex flex-wrap items-center gap-1">
            <span className="min-w-0 break-words">{l.text}</span>
            <Tag tone={l.kind === "button" ? "info" : undefined}>
              {l.kind === "button" ? c.parts.kindButton : c.parts.kindLink}
            </Tag>
            {l.primary ? <Tag>{c.parts.primary}</Tag> : null}
            {pos ? (
              <Tag tone={isAboveFold(pos.top) ? "ok" : "warn"}>
                {isAboveFold(pos.top) ? c.parts.aboveFold : c.parts.belowFold}
              </Tag>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
