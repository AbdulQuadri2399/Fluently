"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { EmailPreviewData } from "@/lib/email/service";
import { previewDocument } from "@/lib/email/preview";
import { FOLD_PX, measureLinks, PHONE_WIDTH, type LinkPosition } from "@/lib/email/fold";
import { LinkList } from "./LinkList";
import { emailCopy as c } from "./copy";

const PHONE_W = PHONE_WIDTH;
const FRAME_H = 800;

/**
 * The email at phone width in a sandboxed frame: no scripts, no network (04 D38). The frame shares
 * its origin with the page only so the page can read where each link sits (the fold, AC31.3b);
 * with no scripts allowed, nothing inside it can run or reach out.
 */
export function EmailPreviewFrame({
  html,
  subject,
  width,
  images,
  onMeasure,
}: {
  html: string;
  subject: string;
  /** The space available; the phone-width page is scaled down to fit it. */
  width: number;
  images: boolean;
  /** Called once the email has been laid out (and again after images load, when they are on). */
  onMeasure?: (doc: Document) => void;
}) {
  const scale = Math.min(1, width / PHONE_W);
  return (
    <div
      className="relative overflow-hidden rounded-sm border border-line bg-surface"
      style={{ width: PHONE_W * scale, height: FRAME_H * scale }}
    >
      <iframe
        title={c.preview.frameTitle(subject)}
        sandbox="allow-same-origin"
        srcDoc={previewDocument(html, { images })}
        onLoad={(e) => {
          const doc = e.currentTarget.contentDocument;
          if (doc) onMeasure?.(doc);
        }}
        style={{
          width: PHONE_W,
          height: FRAME_H,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
      <div
        aria-hidden="true"
        data-testid="fold-line"
        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink/60"
        style={{ top: FOLD_PX * scale }}
      >
        <span className="absolute right-1 -top-4 rounded-xs bg-surface px-1 text-caption text-muted">
          {c.preview.foldLine}
        </span>
      </div>
    </div>
  );
}

/** The preheader and buttons, then the preview with its images switch. */
export function EmailPreviewBody({
  data,
  width,
  measure = measureLinks,
}: {
  data: EmailPreviewData;
  width: number;
  /** Reads link positions from the laid-out email; replaceable in tests. */
  measure?: typeof measureLinks;
}) {
  const [images, setImages] = useState(false);
  const [positions, setPositions] = useState<Record<string, LinkPosition>>({});
  const p = data.parts;
  const wanted = [...p.ctas, ...(p.links ?? [])];
  return (
    <div className="grid gap-3">
      <dl className="grid gap-2">
        <div className="grid gap-0.5">
          <dt className="text-caption text-muted">{c.parts.preheader}</dt>
          <dd className="text-caption text-ink">
            {p.preheader ?? <span className="text-muted">{c.parts.noPreheader}</span>}
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-caption text-muted">{c.parts.buttons}</dt>
          <dd className="text-caption text-ink">
            <LinkList parts={p} positions={positions} />
          </dd>
        </div>
      </dl>
      <div className="grid gap-1.5">
        <p className="text-caption font-medium text-ink">{c.preview.heading}</p>
        <EmailPreviewFrame
          html={data.html}
          subject={data.subject}
          width={width}
          images={images}
          onMeasure={(doc) => setPositions(measure(doc, wanted))}
        />
        <label className="flex items-start gap-2 text-caption">
          <input
            type="checkbox"
            checked={images}
            onChange={(e) => setImages(e.target.checked)}
            className="mt-0.5"
          />
          <span className="grid gap-0.5">
            <span>{c.preview.loadImages}</span>
            <span className="text-muted">
              {images ? c.preview.loadImagesHint : c.preview.imagesOff}
            </span>
          </span>
        </label>
        <p className="text-caption text-muted">
          {images ? c.preview.foldNoteOn : c.preview.foldNote}
        </p>
        <p className="text-caption text-muted">{c.preview.note}</p>
      </div>
    </div>
  );
}

type Load = () => Promise<EmailPreviewData | null>;

function useEmailPreview(load: Load, active: boolean) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "ready"; data: EmailPreviewData } | { status: "failed" }
  >({ status: "loading" });
  useEffect(() => {
    if (!active) return;
    let live = true;
    load()
      .then((data) => live && setState(data ? { status: "ready", data } : { status: "failed" }))
      .catch(() => live && setState({ status: "failed" }));
    return () => {
      live = false;
    };
    // `load` is created per card or per email; it changes only when they do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return state;
}

/** What an expanded email card shows (AC22.9): preheader, buttons and the preview. */
export function EmailExpanded({ load }: { load: Load }) {
  const state = useEmailPreview(load, true);
  return (
    <div className="nodrag nowheel grid gap-2.5 border-t border-line pt-2.5">
      {state.status === "loading" ? (
        <p className="text-caption text-muted">{c.preview.loading}</p>
      ) : null}
      {state.status === "failed" ? (
        <p className="text-caption text-bad">{c.preview.failed}</p>
      ) : null}
      {state.status === "ready" ? <EmailPreviewBody data={state.data} width={256} /> : null}
    </div>
  );
}

/** Preview from the brief's list (right after adding an email). */
export function EmailPreviewDialog({
  open,
  onOpenChange,
  load,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: Load;
}) {
  const state = useEmailPreview(load, open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90vh] gap-4 overflow-y-auto">
        <DialogTitle className="text-panel font-semibold tracking-tight">
          {c.preview.title}
        </DialogTitle>
        <DialogDescription className="sr-only">{c.preview.note}</DialogDescription>
        {state.status === "loading" ? (
          <p className="text-small text-muted">{c.preview.loading}</p>
        ) : null}
        {state.status === "failed" ? (
          <p className="text-small text-bad">{c.preview.failed}</p>
        ) : null}
        {state.status === "ready" ? (
          <>
            <p className="text-small font-medium">{state.data.subject}</p>
            <EmailPreviewBody data={state.data} width={PHONE_W} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
