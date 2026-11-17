"use client";

import { UploadSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/actions/result";
import { canvasCopy as c } from "./copy";

export type AddSourceFns = {
  addLink: (url: string, title: string) => Promise<ActionResult<{ sourceId: string }>>;
  addFile: (file: File) => Promise<ActionResult<{ sourceId: string }>>;
};

/** O35 Add source (AC12.10): paste a link or upload a file. */
export function AddSourceDialog({
  open,
  onOpenChange,
  fns,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fns: AddSourceFns;
  onAdded: () => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function run(job: () => Promise<ActionResult<{ sourceId: string }>>, invalid: string) {
    setBusy(true);
    setError(null);
    const res = await job().catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setUrl("");
      setTitle("");
      onAdded();
      onOpenChange(false);
    } else setError(res && !res.ok && res.code === "validation" ? invalid : c.addSource.failed);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="mb-4">{c.addSource.title}</DialogTitle>
        <form
          className="grid gap-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^https?:\/\/\S+\.\S+/.test(url.trim())) return setError(c.addSource.linkInvalid);
            void run(() => fns.addLink(url.trim(), title.trim()), c.addSource.linkInvalid);
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="source-url">{c.addSource.linkLabel}</Label>
            <Input
              id="source-url"
              type="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-invalid={error === c.addSource.linkInvalid || undefined}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="source-title">{c.addSource.linkTitleLabel}</Label>
            <Input
              id="source-title"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="text-small text-bad">
              {error}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <Button type="submit" loading={busy} loadingLabel={c.addSource.adding}>
              {c.addSource.addLink}
            </Button>
            <span className="text-caption text-muted">{c.addSource.or}</span>
            <input
              ref={file}
              type="file"
              className="sr-only"
              tabIndex={-1}
              aria-label={c.addSource.upload}
              accept=".csv,.txt,.pdf,.xlsx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void run(() => fns.addFile(f), c.addSource.failed);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => file.current?.click()}
            >
              <UploadSimpleIcon aria-hidden="true" />
              {c.addSource.upload}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
