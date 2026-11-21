"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/result";
import { FOLD_PX } from "@/lib/email/fold";
import type { EmailParts } from "@/lib/email/parts";
import type { EmailRenderView } from "@/lib/email/renderService";
import type { EmailPreviewData } from "@/lib/email/service";
import { emailCopy as c } from "./copy";
import { LinkList } from "./LinkList";
import { EmailPreviewFrame } from "./EmailPreview";
import { FRAME_W } from "./PhoneFrame";

export type EmailRenderFns = {
  load: (emailId: string, images: boolean) => Promise<EmailRenderView | null>;
  render: (emailId: string, images: boolean) => Promise<ActionResult<EmailRenderView>>;
};

/** What the code measured, in plain words (AC31.5). */
function MeasuredList({ view, parts }: { view: EmailRenderView; parts: EmailParts }) {
  const m = view.measured;
  const lowest = m.textContrast.lowest;
  return (
    <section aria-label={c.render.measured} className="grid gap-3">
      <h4 className="text-small font-medium">{c.render.measured}</h4>
      <ul className="grid gap-1.5 text-caption">
        <li>{m.responsive ? c.render.fits : c.render.shrunk(m.layoutWidth)}</li>
        <li className={m.textContrast.failing ? "text-warn" : undefined}>
          {m.textContrast.failing && lowest
            ? c.render.contrastBad(
                m.textContrast.failing,
                m.textContrast.samples,
                lowest.snippet,
                lowest.ratio,
              )
            : c.render.contrastOk(m.textContrast.samples)}
        </li>
        <li>{c.render.length(m.words, Math.max(1, Math.round(m.fullHeight / FOLD_PX)))}</li>
        <li>
          {m.preheader.present
            ? c.render.preheaderPresent(m.preheader.length)
            : c.render.preheaderMissing}
        </li>
        <li>{c.parts.imagesCount(m.images.count, m.images.withoutAlt)}</li>
      </ul>
      <div className="grid gap-1">
        <p className="text-caption text-muted">{c.parts.buttons}</p>
        <div className="text-caption">
          <LinkList parts={parts} measured={m.links} />
        </div>
      </div>
      {m.colours.text.length || m.colours.background.length ? (
        <div className="grid gap-1">
          <p className="text-caption text-muted">{c.render.colours}</p>
          {(
            [
              [c.render.colourText, m.colours.text],
              [c.render.colourBackground, m.colours.background],
            ] as const
          ).map(([label, list]) => (
            <div key={label} className="flex flex-wrap items-center gap-1.5 text-caption">
              <span className="w-20 text-muted">{label}</span>
              {list.map((hex) => (
                <span key={hex} className="inline-flex items-center gap-1">
                  <span
                    aria-hidden="true"
                    className="size-3.5 rounded-xs border border-line"
                    style={{ background: hex }}
                  />
                  <span className="font-mono">{hex}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/**
 * The phone view of an email (AC31.4, AC31.5): render it, see the picture the audit will use, and
 * what the code measured. The images switch picks which render is used.
 */
export function EmailRenderSection({
  emailId,
  parts,
  imagesInitial,
  fns,
  loadPreview,
}: {
  emailId: string;
  parts: EmailParts;
  imagesInitial: boolean;
  fns: EmailRenderFns;
  /** The email itself, to show in the phone. `undefined` while loading, `null` if it can't load. */
  loadPreview: () => Promise<EmailPreviewData | null>;
}) {
  const [loadedPreview, setLoadedPreview] = useState<{
    emailId: string;
    data: EmailPreviewData | null;
  } | null>(null);
  const preview = loadedPreview?.emailId === emailId ? loadedPreview.data : undefined;
  useEffect(() => {
    let live = true;
    loadPreview()
      .then((data) => live && setLoadedPreview({ emailId, data }))
      .catch(() => live && setLoadedPreview({ emailId, data: null }));
    return () => {
      live = false;
    };
    // The loader is created per card; only the email matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailId]);
  const [images, setImages] = useState(imagesInitial);
  const [loaded, setLoaded] = useState<{ key: string; view: EmailRenderView | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const key = `${emailId}|${images}`;

  useEffect(() => {
    let live = true;
    fns
      .load(emailId, images)
      .then((view) => live && setLoaded({ key, view }))
      .catch(() => live && setLoaded({ key, view: null }));
    return () => {
      live = false;
    };
    // `fns` is the same set of actions on every render; only the email and the switch matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailId, images, key]);

  const current = loaded?.key === key ? loaded : null;
  const view = current?.view ?? null;

  async function render() {
    setBusy(true);
    setError(false);
    const res = await fns.render(emailId, images).catch(() => null);
    setBusy(false);
    if (res?.ok) setLoaded({ key, view: res.data });
    else setError(true);
  }

  return (
    <section aria-label={c.render.title} className="grid gap-3">
      <h3 className="text-small font-medium">{c.render.title}</h3>
      <label className="flex items-start gap-2 text-caption">
        <input
          type="checkbox"
          checked={images}
          onChange={(e) => {
            setImages(e.target.checked);
            setError(false);
          }}
          className="mt-0.5"
        />
        <span className="grid gap-0.5">
          <span>{c.render.imagesLabel}</span>
          <span className="text-muted">{images ? c.render.imagesOn : c.render.imagesOff}</span>
        </span>
      </label>
      {/* The one phone: the live email, which scrolls all the way down. */}
      {preview === undefined ? (
        <p className="text-caption text-muted">{c.preview.loading}</p>
      ) : preview ? (
        <EmailPreviewFrame
          html={preview.html}
          subject={preview.subject}
          width={FRAME_W * 0.86}
          images={images}
        />
      ) : (
        <p className="text-caption text-bad">{c.preview.failed}</p>
      )}
      {!view && current && !busy ? (
        <p className="text-caption text-muted">{c.render.none}</p>
      ) : null}
      {view && !busy ? <p className="text-caption text-muted">{c.render.rendered}</p> : null}
      {busy ? (
        <p role="status" className="text-caption text-muted">
          {c.render.rendering}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-caption text-bad">
          {c.render.failed}
        </p>
      ) : null}
      <Button
        variant="secondary"
        size="sm"
        className="justify-self-start"
        loading={busy}
        loadingLabel={c.render.rendering}
        onClick={() => void render()}
      >
        {view ? c.render.again : c.render.button}
      </Button>
      {view ? <MeasuredList view={view} parts={parts} /> : null}
    </section>
  );
}
