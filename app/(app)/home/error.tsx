"use client";

import { useEffect } from "react";
import { LoadError } from "@/components/projects/States";

export default function HomeError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="mx-auto w-full max-w-[1040px] px-14 py-11">
      <LoadError onRetry={retry} />
    </main>
  );
}
