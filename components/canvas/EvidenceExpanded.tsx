"use client";

import {
  ArticleIcon,
  CaretDownIcon,
  CaretRightIcon,
  FileCsvIcon,
  FileIcon,
  FilePdfIcon,
  FileXlsIcon,
  GlobeIcon,
  PlusIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { canvasCopy as c } from "./copy";

export type EvidenceItem = { id: string; title: string; sub: string; url: string | null };
export type EvidenceGroup = {
  key: string;
  title: string;
  count: number;
  status: string;
  items: EvidenceItem[];
};

function ItemIcon({ group, sub }: { group: string; sub: string }) {
  const cls = "size-4 shrink-0 text-muted";
  if (group === "papers") return <ArticleIcon aria-hidden="true" className={cls} />;
  if (group !== "client_data") return <GlobeIcon aria-hidden="true" className={cls} />;
  if (sub.startsWith("CSV")) return <FileCsvIcon aria-hidden="true" className={cls} />;
  if (sub.startsWith("PDF")) return <FilePdfIcon aria-hidden="true" className={cls} />;
  if (sub.startsWith("Spreadsheet") || sub.startsWith("XLS"))
    return <FileXlsIcon aria-hidden="true" className={cls} />;
  return <FileIcon aria-hidden="true" className={cls} />;
}

/** The opened Evidence card (AC22.9): sources by kind, three at a time, and Add source (AC12.10). */
export function EvidenceExpanded({
  groups,
  onAddSource,
}: {
  groups: EvidenceGroup[];
  onAddSource?: () => void;
}) {
  const [open, setOpen] = useState<Set<string>>(
    () =>
      new Set(
        groups
          .filter((g) => g.items.length)
          .slice(0, 2)
          .map((g) => g.key),
      ),
  );
  const [all, setAll] = useState<Set<string>>(() => new Set());
  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };
  return (
    <div className="nodrag nowheel grid border-t border-line text-small">
      {groups.map((g) => {
        const isOpen = open.has(g.key) && g.items.length > 0;
        const shown = all.has(g.key) ? g.items : g.items.slice(0, 3);
        return (
          <section key={g.key} className="border-b border-line py-2">
            <button
              type="button"
              aria-expanded={isOpen}
              disabled={!g.items.length}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((s) => toggle(s, g.key));
              }}
              className="flex w-full items-center gap-1.5 rounded-xs py-0.5 text-left font-medium disabled:cursor-default disabled:text-muted"
            >
              {isOpen ? (
                <CaretDownIcon aria-hidden="true" className="size-3.5" />
              ) : (
                <CaretRightIcon aria-hidden="true" className="size-3.5" />
              )}
              <span className="flex-1">{g.title}</span>
              {g.key === "reviews" && g.items.length ? (
                <span className="rounded-xs bg-canvas px-1.5 text-caption font-medium">
                  {c.evidence.qualitative}
                </span>
              ) : null}
              <span className="font-mono text-[12px] text-muted">
                {g.status === "done" || g.items.length ? g.count : (c.stepStatus[g.status] ?? "")}
              </span>
            </button>
            {isOpen ? (
              <ul className="mt-1.5 grid gap-2 pl-5">
                {shown.map((it) => (
                  <li key={it.id} className="flex gap-2">
                    <ItemIcon group={g.key} sub={it.sub} />
                    <span className="grid min-w-0">
                      {it.url ? (
                        <a
                          href={it.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          onClick={(e) => e.stopPropagation()}
                          className="line-clamp-2 font-medium hover:underline"
                        >
                          {it.title}
                        </a>
                      ) : (
                        <span className="line-clamp-2 font-medium">{it.title}</span>
                      )}
                      {it.sub ? (
                        <span className="truncate text-caption text-muted">{it.sub}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
                {g.items.length > 3 ? (
                  <li>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAll((s) => toggle(s, g.key));
                      }}
                      className="text-caption text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
                    >
                      {all.has(g.key)
                        ? c.evidence.showFewer
                        : c.evidence.showMore(g.items.length - 3)}
                    </button>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </section>
        );
      })}
      {onAddSource ? (
        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddSource();
            }}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-line-strong bg-surface px-2.5 text-small font-medium hover:bg-soft",
            )}
          >
            <PlusIcon aria-hidden="true" className="size-3.5" />
            {c.evidence.addSource}
          </button>
          <span className="text-caption text-muted">{c.evidence.addHint}</span>
        </div>
      ) : null}
    </div>
  );
}
