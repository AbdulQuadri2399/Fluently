"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { EmailDetail } from "@/lib/email/service";
import { emailCopy as c } from "./copy";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid gap-0.5">
    <dt className="text-caption text-muted">{label}</dt>
    <dd className="text-small">{children}</dd>
  </div>
);

/** The email split into its parts (AC31.3), read-only, in the details panel. */
export function EmailPartsSection({ detail }: { detail: EmailDetail }) {
  const p = detail.parts;
  const missingAlt = p.images.filter((i) => !i.alt).length;
  return (
    <section aria-label={c.parts.title} className="grid gap-3">
      <h3 className="text-small font-medium">{c.parts.title}</h3>
      <dl className="grid gap-3">
        <Row label={c.parts.subject}>{p.subject}</Row>
        <Row label={c.parts.preheader}>
          {p.preheader ? p.preheader : <span className="text-muted">{c.parts.noPreheader}</span>}
        </Row>
        <Row label={c.parts.hero}>
          {p.hero.headline ?? <span className="text-muted">{c.parts.noHeadline}</span>}
        </Row>
        <Row label={c.parts.buttons}>
          {p.ctas.length ? (
            <ul className="grid gap-0.5">
              {p.ctas.map((cta) => (
                <li key={`${cta.text}|${cta.href}`}>
                  {cta.text}
                  {cta.primary ? <span className="text-muted"> · {c.parts.primary}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-muted">{c.parts.noButtons}</span>
          )}
        </Row>
        <Row label={c.parts.body}>{c.parts.words(p.body.wordCount)}</Row>
        <Row label={c.parts.footer}>
          {p.footer.hasUnsubscribe ? (
            c.parts.unsubscribe
          ) : (
            <span className="text-muted">{c.parts.noUnsubscribe}</span>
          )}
        </Row>
        <Row label={c.parts.images}>{c.parts.imagesCount(p.images.length, missingAlt)}</Row>
      </dl>
    </section>
  );
}

/** Remove an email (AC31.2): its card goes too; what it fed is marked out of date. */
export function RemoveEmailSection({
  disabled,
  onRemove,
}: {
  disabled?: boolean;
  onRemove: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="justify-self-start text-bad"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {c.remove}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="grid gap-4">
          <DialogTitle className="text-panel font-semibold tracking-tight">
            {c.removeTitle}
          </DialogTitle>
          <DialogDescription className="text-body text-muted">{c.removeBody}</DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              {c.cancel}
            </Button>
            <Button
              variant="danger"
              loading={busy}
              loadingLabel={c.removing}
              onClick={async () => {
                setBusy(true);
                const done = await onRemove();
                setBusy(false);
                if (done) setOpen(false);
              }}
            >
              {c.removeConfirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
