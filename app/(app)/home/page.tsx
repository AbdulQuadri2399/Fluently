import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Greeting, RelativeTime } from "@/components/projects/Greeting";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import { PageLoadError } from "@/components/projects/RetryButton";
import { EmptyProjects, ToolkitBanner } from "@/components/projects/States";
import {
  projectsCopy as c,
  runningLine,
  stageNames,
  waitingLines,
} from "@/components/projects/copy";
import { Button } from "@/components/ui/button";
import { createProject } from "@/lib/actions/projects";
import { pageContext } from "@/lib/projects/workspace";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Home" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-small font-medium text-muted">{title}</h2>
      <ul className="border-t border-line">{children}</ul>
    </section>
  );
}

function Row({
  href,
  name,
  line,
  action,
}: {
  href: string;
  name: string;
  line: ReactNode;
  action?: string;
}) {
  return (
    <li className="flex min-h-14 items-center gap-4 border-b border-line py-2.5">
      <div className="grid min-w-0 flex-1">
        <Link href={href} className="truncate text-small font-medium hover:underline">
          {name}
        </Link>
        <span className="truncate text-caption text-muted">{line}</span>
      </div>
      {action ? (
        <Button asChild variant="secondary" size="sm">
          <Link href={href} aria-label={`${action} ${name}`}>
            {action}
          </Link>
        </Button>
      ) : null}
    </li>
  );
}

/** SCR3 Home (03b SCR3): what needs you first, then what's running, then recent work. */
export default async function HomePage() {
  const supabase = await createClient();
  const ctx = await pageContext(supabase);
  if (!ctx) redirect("/sign-in");
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, current_stage, updated_at")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(50);

  const projects = data ?? [];
  const waiting = projects.filter((p) => p.status === "waiting");
  const running = projects.filter((p) => p.status === "running");
  const recent = projects.slice(0, 5);

  return (
    <main className="mx-auto grid w-full max-w-[880px] gap-10 px-14 py-11">
      <div className="flex items-end justify-between gap-6">
        <Greeting name={ctx.firstName} />
        {projects.length > 0 ? <NewProjectDialog action={createProject} /> : null}
      </div>
      {ctx.hasToolkit ? null : <ToolkitBanner isAdmin={ctx.isAdmin} />}
      {error ? (
        <PageLoadError />
      ) : projects.length === 0 ? (
        <EmptyProjects action={<NewProjectDialog action={createProject} />} />
      ) : (
        <>
          <Section title={c.waiting}>
            {waiting.length === 0 ? (
              <li className="border-b border-line py-4 text-small text-muted">
                {c.nothingWaiting}
              </li>
            ) : (
              waiting.map((p) => (
                <Row
                  key={p.id}
                  href={`/projects/${p.id}`}
                  name={p.name}
                  line={waitingLines[p.current_stage] ?? ""}
                  action={c.review}
                />
              ))
            )}
          </Section>
          {running.length > 0 ? (
            <Section title={c.running}>
              {running.map((p) => (
                <Row
                  key={p.id}
                  href={`/projects/${p.id}`}
                  name={p.name}
                  line={runningLine(p.current_stage)}
                  action={c.open}
                />
              ))}
            </Section>
          ) : null}
          <Section title={c.recent}>
            {recent.map((p) => (
              <Row
                key={p.id}
                href={`/projects/${p.id}`}
                name={p.name}
                line={
                  <>
                    {stageNames[p.current_stage] ?? p.current_stage} ·{" "}
                    <RelativeTime iso={p.updated_at} />
                  </>
                }
              />
            ))}
          </Section>
        </>
      )}
    </main>
  );
}
