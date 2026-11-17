"use client";

import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { projectsCopy as c } from "./copy";

/** SCR3 empty (first use). */
export function EmptyProjects({ action }: { action: ReactNode }) {
  return (
    <div className="grid max-w-[440px] gap-3 py-16">
      <h2 className="text-panel font-semibold tracking-tight">{c.emptyTitle}</h2>
      <p className="text-body text-muted">{c.emptyBody}</p>
      <div className="mt-2">{action}</div>
    </div>
  );
}

/** SCR3 empty (no results). */
export function NoResults({ onClear }: { onClear?: () => void }) {
  return (
    <div className="grid justify-items-start gap-3 py-12">
      <p className="text-body">{c.noResults}</p>
      {onClear ? (
        <Button variant="secondary" onClick={onClear}>
          {c.clearSearch}
        </Button>
      ) : null}
    </div>
  );
}

/** SCR3 error. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="grid justify-items-start gap-3 py-12">
      <p className="flex items-center gap-2 text-body text-bad">
        <WarningCircleIcon aria-hidden="true" className="size-4" />
        {c.loadFailed}
      </p>
      <Button variant="secondary" onClick={onRetry}>
        {c.tryAgain}
      </Button>
    </div>
  );
}

/** SCR3 no toolkit yet: admins can upload, members are told who to ask. */
export function ToolkitBanner({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div
      role="status"
      className="flex items-center gap-4 rounded-md border border-line bg-warn-bg px-4 py-3 text-small text-warn"
    >
      <WarningCircleIcon aria-hidden="true" className="size-4 shrink-0" />
      <p className="flex-1">{isAdmin ? c.toolkitNoneYet : c.toolkitNoneYetMember}</p>
      {isAdmin ? (
        <Button asChild variant="secondary" size="sm">
          <Link href="/toolkit">{c.toolkitUpload}</Link>
        </Button>
      ) : null}
    </div>
  );
}

/** SCR3 loading: five skeleton rows, shown only if loading takes longer than 300 ms. */
export function ProjectsSkeleton() {
  return (
    <div aria-hidden="true" className="appear-late grid gap-0">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex h-12 items-center gap-6 border-b border-line">
          <Skeleton className="h-3.5 w-56" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="ml-auto h-3.5 w-28" />
        </div>
      ))}
    </div>
  );
}
