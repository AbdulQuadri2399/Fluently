"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { RunActivity } from "@/lib/canvas/service";
import { createClient } from "@/lib/supabase/client";
import { canvasCopy as c } from "./copy";

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

/** One activity line in plain words (03 section 7, activity.events). */
export function activityLine(e: RunActivity["events"][number]): string | null {
  const step = e.step ? (c.researchSteps[e.step] ?? e.step) : "";
  const n = e.count ?? 0;
  switch (e.kind) {
    case "questions":
      return c.activity.events.questions(n);
    case "started":
      return c.activity.events.started(step);
    case "found":
      return c.activity.events.found(step, n);
    case "kept":
      return c.activity.events.kept(step, n);
    case "dropped":
      return c.activity.events.dropped(n);
    case "done":
      return c.activity.events.done(step);
    case "failed":
      return c.activity.events.failed(step);
    case "paused_cost":
      return c.activity.events.paused;
    case "resumed":
      return c.activity.events.resumed;
    default:
      return null;
  }
}

/**
 * AC11.9, AC11.10: "See what it's doing": the research questions, then the activity log,
 * newest at the bottom. Live while the run is active (realtime, with a 2 s check as backup).
 */
export function ActivityPanel({
  open,
  onOpenChange,
  runId,
  active,
  load,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
  active: boolean;
  load: (runId: string) => Promise<RunActivity>;
}) {
  const [data, setData] = useState<RunActivity | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const refresh = () =>
      void load(runId).then((d) => {
        if (!cancelled) setData(d);
      });
    refresh();
    const timer = active ? setInterval(refresh, 2000) : null;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (active) {
      void supabase.auth.getSession().then(async ({ data: s }) => {
        if (cancelled) return;
        await supabase.realtime.setAuth(s.session?.access_token ?? null);
        if (cancelled) return;
        channel = supabase
          .channel(`run-${runId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "run_events",
              filter: `stage_run_id=eq.${runId}`,
            },
            refresh,
          )
          .subscribe();
      });
    }
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [open, runId, active, load]);

  const lines = (data?.events ?? [])
    .map((e) => ({ id: e.id, at: e.at, text: activityLine(e) }))
    .filter((l): l is { id: string; at: string; text: string } => Boolean(l.text));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent closeLabel={c.activity.close} className="gap-5 overflow-y-auto">
        <SheetTitle className="text-panel font-semibold tracking-tight">
          {c.activity.title}
        </SheetTitle>
        <section aria-labelledby="activity-questions" className="grid gap-2">
          <h3 id="activity-questions" className="text-small font-semibold">
            {c.activity.questions}
          </h3>
          <SheetDescription className="text-caption text-muted">
            {c.activity.questionsHint}
          </SheetDescription>
          {data?.questions.length ? (
            <ol className="grid list-decimal gap-1.5 pl-5 text-small">
              {data.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          ) : null}
        </section>
        <section aria-labelledby="activity-log" className="grid gap-2">
          <h3 id="activity-log" className="text-small font-semibold">
            {c.activity.log}
          </h3>
          {lines.length ? (
            <ol aria-live="polite" className="grid gap-1 text-small">
              {lines.map((l) => (
                <li key={l.id} className="grid grid-cols-[4.5rem_1fr] gap-2">
                  <span className="font-mono text-caption text-muted">{time(l.at)}</span>
                  <span>{l.text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-small text-muted">{c.activity.empty}</p>
          )}
        </section>
      </SheetContent>
    </Sheet>
  );
}
