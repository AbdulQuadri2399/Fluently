"use client";

import { useEffect, useState } from "react";
import { StrengthTag } from "@/components/canvas/StrengthTag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/result";
import type { AuditFinding, EmailAuditView } from "@/lib/audit/service";
import { emailCopy as c } from "./copy";

export type EmailAuditFns = {
  load: (emailId: string) => Promise<EmailAuditView | null>;
  start: (emailId: string) => Promise<ActionResult<{ started: true }>>;
};

const PART_ORDER = ["subject", "preheader", "hero", "body", "ctas", "footer"] as const;
const POLL_MS = 2000;

function Finding({ f }: { f: AuditFinding }) {
  const proofLabel =
    f.proofKind === "quote"
      ? c.audit.proofQuote
      : f.proofKind === "image"
        ? c.audit.proofImage
        : c.audit.proofMeasured;
  return (
    <li className="grid gap-1.5 rounded-sm border border-line p-2.5" data-testid="audit-finding">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge kind="status" tone={f.verdict === "friction" ? "warn" : "ok"}>
          {f.verdict === "friction" ? c.audit.friction : c.audit.working}
        </Badge>
        <Badge>{c.audit.lens[f.lens]}</Badge>
        {f.strength ? <StrengthTag level={f.strength} of="strength" /> : null}
      </div>
      {f.principleName ? (
        <p className="text-caption font-medium">
          {f.principleName}
          {f.extra ? (
            <span className="font-normal text-muted"> · {c.audit.extraMarker}</span>
          ) : null}
        </p>
      ) : null}
      <p className="text-caption text-muted">
        {proofLabel}:{" "}
        <span className="text-ink">
          {f.proofKind === "quote" ? `“${f.proofText}”` : f.proofText}
        </span>
      </p>
      <p className="text-caption">{f.explanation}</p>
    </li>
  );
}

function Results({ view }: { view: EmailAuditView }) {
  const inToolkit = view.findings.filter((f) => !f.outsideToolkit);
  const outside = view.findings.filter((f) => f.outsideToolkit);
  const friction = view.findings.filter((f) => f.verdict === "friction").length;
  const working = view.findings.length - friction;
  const used = view.shortlist.length;
  return (
    <div className="grid gap-3">
      <p className="text-caption font-medium">{c.audit.summary(friction, working)}</p>
      <details className="text-caption text-muted">
        <summary className="cursor-pointer">{c.audit.usedPrinciples(used)}</summary>
        <ul className="mt-1 grid gap-0.5">
          {view.shortlist.map((p) => (
            <li key={p.key}>
              {p.name}
              {p.extra ? ` · ${c.audit.extraMarker}` : ""}
            </li>
          ))}
        </ul>
      </details>
      {PART_ORDER.map((part) => {
        const list = inToolkit.filter((f) => f.part === part);
        if (!list.length) return null;
        return (
          <section key={part} aria-label={c.audit.parts[part]} className="grid gap-1.5">
            <h4 className="text-small font-medium">{c.audit.parts[part]}</h4>
            <ul className="grid gap-1.5">
              {list.map((f) => (
                <Finding key={f.id} f={f} />
              ))}
            </ul>
          </section>
        );
      })}
      {!inToolkit.length ? <p className="text-caption text-muted">{c.audit.noFindings}</p> : null}
      {outside.length ? (
        <section aria-label={c.audit.outsideTitle} className="grid gap-1.5">
          <h4 className="text-small font-medium">{c.audit.outsideTitle}</h4>
          <p className="text-caption text-muted">{c.audit.outsideHelp}</p>
          <ul className="grid gap-1.5">
            {outside.map((f) => (
              <Finding key={f.id} f={f} />
            ))}
          </ul>
        </section>
      ) : null}
      {view.droppedCount ? (
        <p className="text-caption text-muted">{c.audit.dropped(view.droppedCount)}</p>
      ) : null}
      {!view.usedImage ? <p className="text-caption text-muted">{c.audit.noImage}</p> : null}
      {!view.usedMeasured ? <p className="text-caption text-muted">{c.audit.noMeasured}</p> : null}
    </div>
  );
}

/** The quick audit of one email, in the details panel (AC31.6–AC31.8). */
export function EmailAuditSection({ emailId, fns }: { emailId: string; fns: EmailAuditFns }) {
  const [loaded, setLoaded] = useState<{ emailId: string; view: EmailAuditView | null } | null>(
    null,
  );
  const [starting, setStarting] = useState(false);
  const [failedToStart, setFailedToStart] = useState(false);
  const view = loaded?.emailId === emailId ? loaded.view : undefined;
  const running = view?.status === "running";

  useEffect(() => {
    let live = true;
    const load = () =>
      fns
        .load(emailId)
        .then((v) => live && setLoaded({ emailId, view: v }))
        .catch(() => live && setLoaded({ emailId, view: null }));
    void load();
    // Keep checking while the audit runs in the background.
    const timer = running ? setInterval(() => void load(), POLL_MS) : undefined;
    return () => {
      live = false;
      if (timer) clearInterval(timer);
    };
    // `fns` is the same set of actions on every render; only the email and the running state matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailId, running]);

  async function start() {
    setStarting(true);
    setFailedToStart(false);
    const res = await fns.start(emailId).catch(() => null);
    if (!res?.ok) {
      setStarting(false);
      setFailedToStart(true);
      return;
    }
    const v = await fns.load(emailId).catch(() => null);
    setLoaded({ emailId, view: v });
    setStarting(false);
  }

  const busy = starting || running;
  return (
    <section aria-label={c.audit.title} className="grid gap-3">
      <h3 className="text-small font-medium">{c.audit.title}</h3>
      <p className="text-caption text-muted">{c.audit.help}</p>
      <Button
        variant="secondary"
        size="sm"
        className="justify-self-start"
        loading={busy}
        loadingLabel={c.audit.running}
        onClick={() => void start()}
      >
        {view && view.status !== "running" ? c.audit.again : c.audit.run}
      </Button>
      {running ? (
        <p role="status" className="text-caption text-muted">
          {c.audit.running}
        </p>
      ) : null}
      {failedToStart || view?.status === "failed" ? (
        <p role="alert" className="text-caption text-bad">
          {view?.errorCode === "no_toolkit" ? c.audit.noToolkit : c.audit.failed}
        </p>
      ) : null}
      {view === null ? <p className="text-caption text-muted">{c.audit.notRun}</p> : null}
      {view?.status === "done" ? <Results view={view} /> : null}
    </section>
  );
}
