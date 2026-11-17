"use client";

import { useRouter } from "next/navigation";
import { LoadError } from "./States";

/** SCR3 error state for server-rendered pages: Try again re-runs the page's data load. */
export function PageLoadError() {
  const router = useRouter();
  return <LoadError onRetry={() => router.refresh()} />;
}
