"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Live tree (AC11.2, AC22.3, D5): reloads the page data when this project's cards, lines or
 * runs change, at most every 250 ms. While a run is active it also checks every 2 s, in case
 * a live update is missed.
 */
export function useRealtimeProject(projectId: string, active: boolean) {
  const router = useRouter();
  const last = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const refresh = () => {
      const wait = Math.max(0, 250 - (Date.now() - last.current));
      if (pending.current) return;
      pending.current = setTimeout(() => {
        pending.current = null;
        last.current = Date.now();
        router.refresh();
      }, wait);
    };
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    // The live connection must carry the member's sign-in, or access rules hide every change,
    // so the token is set before the channel is created and joined.
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (cancelled) return;
      channel = supabase.channel(`project-${projectId}`);
      for (const table of ["nodes", "edges", "stage_runs"]) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `project_id=eq.${projectId}` },
          refresh,
        );
      }
      channel.subscribe();
    });
    return () => {
      cancelled = true;
      if (pending.current) clearTimeout(pending.current);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(id);
  }, [active, router]);
}
