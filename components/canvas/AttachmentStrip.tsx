"use client";

import { SidebarSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { canvasCopy as c } from "./copy";

/**
 * A strip along the bottom of a card that has something behind it (an email, screens, sources).
 * It says what is attached and that the side panel shows it. Clicking it opens the panel: the
 * click bubbles to the card, which selects itself.
 */
export function AttachmentStrip({
  Icon,
  phone = false,
  title,
  hint,
  selected,
}: {
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Draw the icon in a tall phone shape (emails) instead of a square. */
  phone?: boolean;
  title: string;
  hint: string;
  selected?: boolean;
}) {
  return (
    <div
      data-testid="attachment-strip"
      className={cn(
        "flex cursor-pointer items-center gap-2.5 border-t border-line pt-2.5 text-caption",
        selected && "text-ink",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid shrink-0 place-items-center border-2 bg-soft text-muted",
          phone ? "h-8 w-[22px] rounded-[5px]" : "size-8 rounded-sm",
          selected ? "border-ink text-ink" : "border-line-strong",
        )}
      >
        <Icon aria-hidden className={phone ? "size-3" : "size-4"} />
      </span>
      <span className="grid min-w-0 flex-1 leading-tight">
        <span className="font-medium">{title}</span>
        <span className="text-muted">{selected ? c.attachment.showing : hint}</span>
      </span>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
          selected ? "border-ink bg-ink text-surface" : "border-line-strong text-muted",
        )}
      >
        {c.attachment.open}
        <SidebarSimpleIcon aria-hidden="true" className="size-3" />
      </span>
    </div>
  );
}
