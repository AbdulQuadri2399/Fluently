"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/result";
import type { ProjectRow } from "@/lib/projects/service";
import type { ListProjectsInput } from "@/lib/schemas/project";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/useNow";
import {
  channelNames,
  editedBy,
  projectsCopy as c,
  relativeTime,
  stageNames,
  statusNames,
} from "./copy";
import { ProjectMenu, type ProjectMenuActions } from "./ProjectMenu";
import { NoResults } from "./States";

type Page = { items: ProjectRow[]; nextCursor: string | null };
type Filter = "active" | "archived";

export const statusTone: Record<string, "neutral" | "ok" | "warn" | "bad" | "info"> = {
  waiting: "info",
  running: "neutral",
  in_progress: "neutral",
  failed: "bad",
  blocked: "warn",
  complete: "ok",
};

/** SCR3 default state: search, Active / Archived, the table, archive / restore, load more. */
export function ProjectsList({
  initial,
  filter,
  search,
  list,
  archive,
  restore,
  update,
  remove,
  isAdmin = false,
}: {
  initial: Page;
  filter: Filter;
  search: string;
  list: (input: ListProjectsInput) => Promise<ActionResult<Page>>;
  archive: (id: string) => Promise<ActionResult>;
  restore: (id: string) => Promise<ActionResult>;
  update: ProjectMenuActions["update"];
  remove: ProjectMenuActions["remove"];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [rows, setRows] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [query, setQuery] = useState(search);
  const [loadingMore, startMore] = useTransition();
  const now = useNow();

  function go(next: { filter?: Filter; search?: string }) {
    const params = new URLSearchParams();
    const f = next.filter ?? filter;
    const s = next.search ?? query;
    if (f !== "active") params.set("filter", f);
    if (s.trim()) params.set("search", s.trim());
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const drop = (id: string) => {
    setRows((r) => r.filter((x) => x.id !== id));
    router.refresh();
  };

  function loadMore() {
    if (!cursor) return;
    startMore(async () => {
      const res = await list({ filter, search: search || undefined, cursor });
      if (!res.ok) {
        toast.error(c.loadFailed);
        return;
      }
      setRows((r) => [...r, ...res.data.items]);
      setCursor(res.data.nextCursor);
    });
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            go({ search: query });
          }}
        >
          <label htmlFor="projects-search" className="sr-only">
            {c.search}
          </label>
          <input
            id="projects-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.search}
            className="h-9 w-72 rounded-sm border border-line-strong bg-surface px-3 text-small placeholder:text-muted"
          />
        </form>
        <div role="group" className="flex rounded-sm bg-canvas p-0.5">
          {(["active", "archived"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => go({ filter: f })}
              className={cn(
                "h-8 rounded-[5px] px-3 text-small text-muted",
                filter === f && "bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--line)]",
              )}
            >
              {f === "active" ? c.filterActive : c.filterArchived}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <NoResults
          onClear={
            search
              ? () => {
                  setQuery("");
                  go({ search: "" });
                }
              : undefined
          }
        />
      ) : (
        <table className="w-full border-collapse text-small">
          <thead>
            <tr className="border-b border-line text-left text-caption text-muted">
              <th className="py-2 pr-4 font-medium">{c.colName}</th>
              <th className="py-2 pr-4 font-medium">{c.colStage}</th>
              <th className="py-2 pr-4 font-medium">{c.colChannel}</th>
              <th className="py-2 pr-4 font-medium">{c.colEdited}</th>
              <th className="w-px py-2">
                <span className="sr-only">{c.menu("")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="group border-b border-line hover:bg-soft">
                <td className="py-3 pr-4">
                  <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  {p.clientLabel ? <span className="ml-2 text-muted">{p.clientLabel}</span> : null}
                </td>
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-2">
                    {stageNames[p.currentStage] ?? p.currentStage}
                    {p.status !== "in_progress" ? (
                      <Badge kind="status" tone={statusTone[p.status] ?? "neutral"}>
                        {statusNames[p.status] ?? p.status}
                      </Badge>
                    ) : null}
                  </span>
                </td>
                <td className="py-3 pr-4 text-muted">{channelNames[p.channel] ?? p.channel}</td>
                <td className="py-3 pr-4 text-muted">
                  {now ? editedBy(relativeTime(p.updatedAt, now), p.updatedByName) : null}
                </td>
                <td className="py-3 text-right">
                  <ProjectMenu
                    project={{ id: p.id, name: p.name, clientLabel: p.clientLabel }}
                    archived={filter === "archived"}
                    isAdmin={isAdmin}
                    actions={{ update, archive, restore, remove }}
                    onChanged={() => router.refresh()}
                    onArchived={() => drop(p.id)}
                    onDeleted={() => drop(p.id)}
                    className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {cursor ? (
        <div>
          <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
            {c.loadMore}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
