"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/actions/result";
import { checkFile, extensionOf } from "@/lib/uploads/rules";
import { cn } from "@/lib/utils";
import { emailCopy as c } from "./copy";

export type AddEmailFns = {
  addPaste: (subject: string, html: string) => Promise<ActionResult<{ id: string }>>;
  addFile: (file: File, subject: string) => Promise<ActionResult<{ id: string }>>;
};

/** Adds an email (AC31.2): paste HTML, or choose an `.html` or `.eml` file; subject line field. */
export function AddEmailDialog({
  open,
  onOpenChange,
  fns,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fns: AddEmailFns;
  onAdded: () => void;
}) {
  const [tab, setTab] = useState<"paste" | "file">("paste");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEml = file ? extensionOf(file.name) === "eml" : false;

  async function submit() {
    setError(null);
    if (tab === "paste") {
      if (!subject.trim()) return setError(c.subjectNeeded);
      if (!html.trim()) return setError(c.htmlNeeded);
    } else {
      if (!file) return setError(c.fileNeeded);
      if (
        checkFile(file, "asset", "email") !== "ok" ||
        !["html", "htm", "eml"].includes(extensionOf(file.name))
      )
        return setError(c.fileType);
      if (!isEml && !subject.trim()) return setError(c.subjectNeeded);
    }
    setBusy(true);
    const res = await (
      tab === "paste" ? fns.addPaste(subject, html) : fns.addFile(file!, subject)
    ).catch(() => null);
    setBusy(false);
    if (!res) return setError(c.failed);
    if (!res.ok) {
      return setError(
        res.code === "too_many"
          ? c.tooMany
          : res.code === "validation"
            ? tab === "file" && isEml
              ? c.noHtml
              : c.subjectNeeded
            : c.failed,
      );
    }
    setSubject("");
    setHtml("");
    setFile(null);
    onAdded();
    onOpenChange(false);
  }

  const tabButton = (value: "paste" | "file", label: string) => (
    <button
      type="button"
      aria-pressed={tab === value}
      onClick={() => {
        setTab(value);
        setError(null);
      }}
      className={cn(
        "h-8 rounded-sm px-3 text-small text-muted",
        tab === value && "bg-canvas font-medium text-ink",
      )}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="grid max-h-[85vh] gap-4 overflow-y-auto">
        <DialogTitle className="text-panel font-semibold tracking-tight">{c.addTitle}</DialogTitle>
        <DialogDescription className="sr-only">{c.help}</DialogDescription>
        <div
          role="group"
          aria-label={c.addTitle}
          className="flex w-fit gap-0.5 rounded-sm bg-soft p-0.5"
        >
          {tabButton("paste", c.tabPaste)}
          {tabButton("file", c.tabFile)}
        </div>
        <form
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="email-subject">{c.subjectLabel}</Label>
            <Input
              id="email-subject"
              value={subject}
              maxLength={300}
              onChange={(e) => {
                setSubject(e.target.value);
                setError(null);
              }}
            />
            {tab === "file" ? <p className="text-caption text-muted">{c.subjectHelp}</p> : null}
          </div>
          {tab === "paste" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="email-html">{c.htmlLabel}</Label>
              <Textarea
                id="email-html"
                rows={8}
                value={html}
                className="font-mono text-caption"
                onChange={(e) => {
                  setHtml(e.target.value);
                  setError(null);
                }}
              />
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="email-file">{c.fileLabel}</Label>
              <input
                id="email-file"
                type="file"
                accept=".html,.htm,.eml"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError(null);
                }}
                className="text-small"
              />
              <p className="text-caption text-muted">{c.fileHelp}</p>
            </div>
          )}
          {error ? (
            <p role="alert" className="text-small text-bad">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {c.cancel}
            </Button>
            <Button type="submit" loading={busy} loadingLabel={c.adding}>
              {c.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
