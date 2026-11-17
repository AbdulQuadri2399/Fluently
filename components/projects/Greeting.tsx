"use client";

import { useNow } from "@/hooks/useNow";
import { greeting, relativeTime } from "./copy";

/** Date and greeting in the person's own time zone (rendered after hydration). */
export function Greeting({ name }: { name: string }) {
  const now = useNow();
  return (
    <div className="grid gap-1">
      <p className="h-5 text-small text-muted">
        {now
          ? now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
          : null}
      </p>
      <h1 className="h-9 text-page font-semibold tracking-[-0.03em]">
        {now ? greeting(now, name) : null}
      </h1>
    </div>
  );
}

export function RelativeTime({ iso }: { iso: string }) {
  const now = useNow();
  return <>{now ? relativeTime(iso, now) : null}</>;
}
