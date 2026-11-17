"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { authCopy } from "@/components/auth/copy";
import { channelNames } from "@/components/projects/copy";
import { ProjectMenu, type ProjectMenuActions } from "@/components/projects/ProjectMenu";
import { toolkitCopy } from "@/components/toolkit/copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnline } from "@/hooks/useOnline";
import type { ActionResult } from "@/lib/actions/result";
import { formatGbp } from "@/lib/ai/cost";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { canvasCopy as c } from "./copy";

export type HeaderInfo = {
  id: string;
  name: string;
  mode: string;
  channel: string;
  pinned: number | null;
  clientLabel: string | null;
  archived: boolean;
  isAdmin: boolean;
  latest: number | null;
  spentGbp: number;
  capGbp: number;
};

const MODE_NAMES: Record<string, string> = { new: "New", optimise: "Optimise" };

/** FF14: if the session ends, sign in again in place; nothing on the page is lost. */
export function SessionGuard({
  signIn,
}: {
  signIn: (i: { email: string; password: string }) => Promise<ActionResult<{ next: string }>>;
}) {
  const router = useRouter();
  const [expired, setExpired] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const check = async () => {
      const { data, error: e } = await createClient().auth.getUser();
      if (e || !data.user) setExpired(true);
    };
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    const id = setInterval(check, 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(id);
    };
  }, []);
  return (
    <Dialog open={expired}>
      <DialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="mb-2">{authCopy.signInTitle}</DialogTitle>
        <DialogDescription>{c.sessionExpired}</DialogDescription>
        <form
          className="mt-5 grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const res = await signIn({ email, password }).catch(() => null);
            setBusy(false);
            if (res?.ok) {
              setExpired(false);
              setPassword("");
              router.refresh();
            } else setError(true);
          }}
        >
          {error ? (
            <p role="alert" className="text-small text-bad">
              {authCopy.wrongCredentials}
            </p>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="guard-email">{authCopy.emailLabel}</Label>
            <Input
              id="guard-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="guard-password">{authCopy.passwordLabel}</Label>
            <Input
              id="guard-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" loading={busy} loadingLabel={authCopy.signingIn}>
            {authCopy.signIn}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Project header and tabs (T5.7, SCR5): name, mode · channel, toolkit version, AI spend. */
export function ProjectShell({
  header,
  signIn,
  children,
  projectActions,
}: {
  header: HeaderInfo;
  signIn: (i: { email: string; password: string }) => Promise<ActionResult<{ next: string }>>;
  children: ReactNode;
  projectActions?: ProjectMenuActions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const online = useOnline();
  const base = `/projects/${header.id}`;
  const tabs = [
    { href: base, label: c.tabs.canvas, current: pathname === base },
    { href: `${base}/brief`, label: c.tabs.brief, current: pathname.startsWith(`${base}/brief`) },
    {
      href: `${base}/report`,
      label: c.tabs.report,
      current: pathname.startsWith(`${base}/report`),
    },
  ];
  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <header className="flex items-end gap-6 border-b border-line bg-paper px-6 pt-4">
        <div className="grid min-w-0 gap-0.5 pb-3">
          <div className="flex min-w-0 items-center gap-1">
            <h1 className="truncate text-lead font-semibold tracking-tight">{header.name}</h1>
            {header.clientLabel ? (
              <span className="truncate text-small text-muted">· {header.clientLabel}</span>
            ) : null}
            {projectActions ? (
              <ProjectMenu
                project={{ id: header.id, name: header.name, clientLabel: header.clientLabel }}
                archived={header.archived}
                isAdmin={header.isAdmin}
                actions={projectActions}
                onChanged={() => router.refresh()}
                onArchived={(archived) =>
                  router.push(archived ? "/projects?filter=archived" : "/projects")
                }
                onDeleted={() => router.push("/projects")}
              />
            ) : null}
          </div>
          <p className="truncate text-caption text-muted">
            {MODE_NAMES[header.mode] ?? header.mode} ·{" "}
            {channelNames[header.channel] ?? header.channel}
            {header.pinned !== null ? ` · ${toolkitCopy.pinned(header.pinned)}` : ""}
            {header.pinned !== null && header.latest !== null && header.latest > header.pinned
              ? ` (${toolkitCopy.newer(header.latest)})`
              : ""}
            {` · ${c.cost(formatGbp(header.spentGbp), formatGbp(header.capGbp))}`}
          </p>
          {header.capGbp > 0 && header.spentGbp >= header.capGbp * 0.8 ? (
            <p role="status" className="justify-self-start">
              <Badge kind="status" tone={header.spentGbp >= header.capGbp ? "bad" : "warn"}>
                {c.nearCap(formatGbp(header.spentGbp), formatGbp(header.capGbp))}
              </Badge>
            </p>
          ) : null}
        </div>
        <nav aria-label={header.name} className="ml-auto flex gap-1">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={t.current ? "page" : undefined}
              className={cn(
                "border-b-2 border-transparent px-3 pb-3 text-small text-muted hover:text-ink",
                t.current && "border-ink font-medium text-ink",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>
      {!online ? (
        <p role="status" className="border-b border-warn bg-warn-bg px-6 py-2 text-small text-warn">
          {c.offline}
        </p>
      ) : null}
      <div className="relative min-h-0 flex-1 overflow-auto">{children}</div>
      <SessionGuard signIn={signIn} />
    </div>
  );
}
