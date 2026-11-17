"use client";

import { FileIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { canvasCopy as c } from "./copy";

export type AssetThumb = { id: string; fileName: string; url: string | null };
export const ASSET_MIME = "application/x-fluently-asset";

/** Opened Current assets card (AC22.10, AC22.11): thumbnails; select to split; drag to another card. */
export function AssetsExpanded({
  assets,
  onSplit,
}: {
  assets: AssetThumb[];
  onSplit?: (uploadIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const canSplit = selected.size > 0 && selected.size < assets.length;
  return (
    <div className="nodrag nowheel grid gap-2.5 border-t border-line pt-2.5">
      <ul className="grid grid-cols-3 gap-2">
        {assets.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              draggable
              aria-pressed={selected.has(a.id)}
              aria-label={c.assets.select(a.fileName)}
              title={a.fileName}
              onDragStart={(e) => {
                const ids = selected.has(a.id) ? [...selected] : [a.id];
                e.dataTransfer.setData(ASSET_MIME, JSON.stringify(ids));
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelected((s) => {
                  const next = new Set(s);
                  if (next.has(a.id)) next.delete(a.id);
                  else next.add(a.id);
                  return next;
                });
              }}
              className={cn(
                "grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-sm border border-line bg-soft",
                selected.has(a.id) && "border-ink shadow-[0_0_0_2px_var(--line)]",
              )}
            >
              {a.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived private links, not optimisable
                <img src={a.url} alt={a.fileName} className="size-full object-cover object-top" />
              ) : (
                <FileIcon aria-hidden="true" className="size-5 text-muted" />
              )}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-caption text-muted">{c.assets.hint}</p>
      {onSplit ? (
        <div>
          <button
            type="button"
            disabled={!canSplit}
            onClick={(e) => {
              e.stopPropagation();
              onSplit([...selected]);
              setSelected(new Set());
            }}
            className="h-8 rounded-sm border border-line-strong bg-surface px-2.5 text-small font-medium hover:bg-soft disabled:opacity-40"
          >
            {c.assets.split}
          </button>
        </div>
      ) : null}
    </div>
  );
}
