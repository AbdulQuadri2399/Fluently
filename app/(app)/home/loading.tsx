import { ProjectsSkeleton } from "@/components/projects/States";

export default function Loading() {
  return (
    <main className="mx-auto grid w-full max-w-[1040px] gap-6 px-14 py-11">
      <ProjectsSkeleton />
    </main>
  );
}
