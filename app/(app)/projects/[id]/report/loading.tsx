import { Skeleton } from "@/components/ui/skeleton";

/** SCR9 loading: skeleton paragraphs. */
export default function Loading() {
  return (
    <main aria-busy="true" className="mx-auto grid w-full max-w-[680px] gap-4 px-6 py-11">
      <Skeleton className="h-7 w-48" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </main>
  );
}
