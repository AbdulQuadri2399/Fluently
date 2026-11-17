"use client";

import { FileIcon, PlusIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/result";
import { checkFile, uploadRule, type Channel, type UploadKind } from "@/lib/uploads/rules";
import type { UploadRow } from "@/lib/uploads/service";
import { intakeCopy as c } from "./copy";

type Pending = { key: string; name: string; error?: string };

/** Upload rows for current assets or client data (AC8.6–AC8.8, FF3): rejects only the bad file. */
export function UploadList({
  kind,
  channel,
  label,
  help,
  files,
  disabled,
  uploadFile,
  removeFile,
  onChange,
}: {
  kind: UploadKind;
  channel: Channel;
  label: string;
  help: string;
  files: UploadRow[];
  disabled?: boolean;
  uploadFile: (kind: UploadKind, file: File) => Promise<ActionResult<UploadRow>>;
  removeFile: (id: string) => Promise<ActionResult>;
  onChange: (files: UploadRow[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const rule = uploadRule(kind, channel);
  const id = `upload-${kind}`;

  async function add(list: FileList | null) {
    if (!list) return;
    let room = rule.maxFiles - files.length;
    let added = [...files];
    for (const file of Array.from(list)) {
      const key = `${file.name}-${crypto.randomUUID()}`;
      if (checkFile(file, kind, channel) !== "ok") {
        setPending((p) => [
          ...p,
          { key, name: file.name, error: c.typeOrSize(file.name, rule.label, rule.sizeLabel) },
        ]);
        continue;
      }
      if (room <= 0) {
        setPending((p) => [...p, { key, name: file.name, error: c.tooMany(rule.maxFiles) }]);
        continue;
      }
      room -= 1;
      setPending((p) => [...p, { key, name: file.name }]);
      const res = await uploadFile(kind, file).catch(() => null);
      if (res?.ok) {
        added = [...added, res.data];
        onChange(added);
        setPending((p) => p.filter((x) => x.key !== key));
      } else {
        setPending((p) =>
          p.map((x) =>
            x.key === key
              ? { ...x, error: c.typeOrSize(file.name, rule.label, rule.sizeLabel) }
              : x,
          ),
        );
      }
    }
  }

  return (
    <div className="grid gap-2">
      <p id={`${id}-label`} className="text-small font-medium">
        {label}
      </p>
      <p className="text-caption text-muted">{help}</p>
      <ul aria-labelledby={`${id}-label`} className="grid gap-1.5">
        {files.map((f) => (
          <li
            key={f.id}
            className="flex h-10 items-center gap-3 rounded-sm border border-line bg-surface px-3 text-small"
          >
            <FileIcon aria-hidden="true" className="size-4 text-muted" />
            <span className="flex-1 truncate">{f.fileName}</span>
            {disabled ? null : (
              <button
                type="button"
                aria-label={c.removeFile(f.fileName)}
                className="grid size-6 place-items-center rounded-xs text-muted hover:bg-soft hover:text-ink"
                onClick={async () => {
                  const res = await removeFile(f.id).catch(() => null);
                  if (res?.ok) onChange(files.filter((x) => x.id !== f.id));
                }}
              >
                <XIcon aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </li>
        ))}
        {pending.map((p) => (
          <li
            key={p.key}
            className="grid gap-1.5 rounded-sm border border-line bg-surface px-3 py-2 text-small"
            role={p.error ? "alert" : "status"}
          >
            <div className="flex items-center gap-3">
              <FileIcon aria-hidden="true" className="size-4 text-muted" />
              <span className="flex-1 truncate">{p.error ?? `${p.name} · ${c.uploading}`}</span>
              {p.error ? (
                <button
                  type="button"
                  aria-label={c.removeFile(p.name)}
                  className="grid size-6 place-items-center rounded-xs text-muted hover:bg-soft hover:text-ink"
                  onClick={() => setPending((x) => x.filter((y) => y.key !== p.key))}
                >
                  <XIcon aria-hidden="true" className="size-3.5" />
                </button>
              ) : null}
            </div>
            {p.error ? null : (
              <span aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-canvas">
                <span className="block h-full w-1/3 animate-pulse rounded-full bg-ink/40" />
              </span>
            )}
          </li>
        ))}
      </ul>
      {disabled ? null : (
        <div>
          <input
            ref={input}
            id={id}
            type="file"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-label={`${c.addFiles}: ${label}`}
            accept={rule.extensions.map((e) => `.${e}`).join(",")}
            onChange={(e) => {
              void add(e.target.files);
              e.target.value = "";
            }}
          />
          <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
            <PlusIcon aria-hidden="true" />
            {c.addFiles}
          </Button>
        </div>
      )}
    </div>
  );
}
