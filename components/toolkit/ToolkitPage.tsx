"use client";

import { UploadSimpleIcon, WarningCircleIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { RelativeTime } from "@/components/projects/Greeting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ActionResult } from "@/lib/actions/result";
import {
  parseToolkit,
  type ParseResult,
  type ToolkitError,
  type ToolkitWarning,
} from "@/lib/toolkit/parse";
import type { SaveToolkitInput, ToolkitVersionRow } from "@/lib/toolkit/service";
import { toolkitCopy as c } from "./copy";

type Save = (
  input: SaveToolkitInput,
) => Promise<ActionResult<{ versionId: string; number: number }>>;

type Upload =
  | { state: "idle" }
  | { state: "validating"; fileName: string }
  | { state: "preview"; fileName: string; content: string; result: ParseResult }
  | { state: "saving"; fileName: string; content: string; result: ParseResult };

export function errorMessage(e: ToolkitError): string {
  switch (e.kind) {
    case "file":
      return c.errorFile;
    case "unreadable":
      return c.errorUnreadable;
    case "empty":
      return c.errorEmpty;
    case "missingColumns":
      return c.errorMissingColumns(e.columns);
    case "missingId":
      return c.errorMissingId(e.row);
    case "duplicateId":
      return c.errorDuplicateId(e.rows, e.id);
  }
}

export function warningMessage(w: ToolkitWarning): string {
  switch (w.kind) {
    case "unknownColumns":
      return c.warnUnknownColumns(w.columns);
    case "relatedNotFound":
      return c.warnRelatedNotFound(w.row, w.text);
    case "generatedIds":
      return c.warnGeneratedIds;
    case "noName":
      return c.warnNoName(w.row);
    case "mergedSameName":
      return c.warnMergedSameName(w.name, w.rows);
    case "goalsUnified":
      return c.warnGoalsUnified(w.variants, w.used);
    case "thinRows":
      return c.warnThinRows(w.count, w.names);
  }
}

/** Reads the chosen file and runs the same checks the server runs on save (AC4.1). */
async function check(file: File): Promise<{ content: string; result: ParseResult }> {
  if (file.size > 10 * 1024 * 1024) {
    return {
      content: "",
      result: { ok: false, rowCount: 0, errors: [{ kind: "file" }], warnings: [] },
    };
  }
  const content = await file.text();
  return { content, result: parseToolkit(content, file.name, file.size) };
}

function Preview({
  upload,
  nextNumber,
  onSave,
  onChooseAnother,
  onCancel,
}: {
  upload: Extract<Upload, { state: "preview" | "saving" }>;
  nextNumber: number;
  onSave: () => void;
  onChooseAnother: () => void;
  onCancel: () => void;
}) {
  const r = upload.result;
  return (
    <section
      aria-label={c.previewTitle(upload.fileName)}
      className="grid gap-4 rounded-lg border border-line bg-surface p-5"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="truncate text-lead font-semibold">{upload.fileName}</h2>
        <p className="shrink-0 font-mono text-[12px] text-muted">
          {c.rowCount(r.rowCount)}
          {r.ok ? ` · ${c.principleCount(r.principles.length)}` : ""}
        </p>
      </div>
      {r.ok ? (
        <p className="text-small text-muted">
          {c.evidenceCounts(r.evidence.strong, r.evidence.some, r.evidence.none)}
        </p>
      ) : (
        <div role="alert" className="grid gap-2 rounded-md bg-bad-bg p-4 text-small text-bad">
          <p className="flex items-center gap-2 font-medium">
            <WarningCircleIcon aria-hidden="true" className="size-4 shrink-0" />
            {c.errorsTitle}
          </p>
          <ul className="grid list-disc gap-1 pl-6">
            {r.errors.map((e, i) => (
              <li key={i}>{errorMessage(e)}</li>
            ))}
          </ul>
        </div>
      )}
      {r.warnings.length > 0 ? (
        <div className="grid gap-2 rounded-md bg-warn-bg p-4 text-small text-warn">
          <p className="flex items-center gap-2 font-medium">
            <WarningIcon aria-hidden="true" className="size-4 shrink-0" />
            {c.warningsTitle}
          </p>
          <ul className="grid list-disc gap-1 pl-6">
            {r.warnings.map((w, i) => (
              <li key={i}>{warningMessage(w)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={upload.state === "saving"}>
          {c.cancel}
        </Button>
        <Button variant="secondary" onClick={onChooseAnother} disabled={upload.state === "saving"}>
          {c.chooseAnother}
        </Button>
        {r.ok ? (
          <Button
            onClick={onSave}
            loading={upload.state === "saving"}
            loadingLabel={c.savingAs(nextNumber)}
          >
            {c.saveAs(nextNumber)}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function Versions({ versions }: { versions: ToolkitVersionRow[] }) {
  return (
    <table className="w-full border-collapse text-small">
      <thead>
        <tr className="border-b border-line text-left text-caption text-muted">
          <th className="py-2 pr-4 font-medium">{c.colVersion}</th>
          <th className="py-2 pr-4 font-medium">{c.colFile}</th>
          <th className="py-2 pr-4 font-medium">{c.colUploaded}</th>
          <th className="py-2 pr-4 text-right font-medium">{c.colPrinciples}</th>
          <th className="py-2 font-medium">{c.colEvidence}</th>
        </tr>
      </thead>
      <tbody>
        {versions.map((v) => (
          <tr key={v.id} className="border-b border-line">
            <td className="py-3 pr-4">
              <span className="flex items-center gap-2 font-medium">
                {c.versionLabel(v.number)}
                {v.isDefault ? (
                  <Badge kind="status" tone="ok">
                    {c.defaultChip}
                  </Badge>
                ) : null}
              </span>
            </td>
            <td className="max-w-[220px] truncate py-3 pr-4 font-mono text-[12.5px] text-muted">
              {v.fileName}
            </td>
            <td className="py-3 pr-4 text-muted">
              <RelativeTime iso={v.uploadedAt} />
              {v.uploadedBy ? ` · ${v.uploadedBy}` : ""}
            </td>
            <td className="py-3 pr-4 text-right font-mono text-[12.5px]">{v.principleCount}</td>
            <td className="py-3 text-muted">
              {c.evidenceCounts(v.evidence.strong, v.evidence.some, v.evidence.none)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** SCR11 Toolkit (AC4.1–AC4.5, FL7, FF9). Admins upload; members browse. */
export function ToolkitPage({
  isAdmin,
  versions,
  nextNumber,
  save,
}: {
  isAdmin: boolean;
  versions: ToolkitVersionRow[];
  nextNumber: number;
  save: Save;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<Upload>({ state: "idle" });
  const [failed, setFailed] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFailed(false);
    setUpload({ state: "validating", fileName: file.name });
    const { content, result } = await check(file);
    setUpload({ state: "preview", fileName: file.name, content, result });
  }

  async function onSave() {
    if (upload.state !== "preview") return;
    setUpload({ ...upload, state: "saving" });
    try {
      const res = await save({ fileName: upload.fileName, content: upload.content });
      if (res.ok) {
        toast(c.saved(res.data.number));
        setUpload({ state: "idle" });
        router.refresh();
        return;
      }
    } catch {
      // fall through to the error state
    }
    setFailed(true);
    setUpload({ ...upload, state: "preview" });
  }

  const chooseFile = () => {
    if (input.current) input.current.value = "";
    input.current?.click();
  };

  return (
    <main className="mx-auto grid w-full max-w-[1040px] gap-6 px-14 py-11">
      <div className="flex items-center justify-between">
        <h1 className="text-page font-semibold tracking-[-0.03em]">{c.title}</h1>
        {isAdmin && versions.length > 0 && upload.state === "idle" ? (
          <Button variant="secondary" onClick={chooseFile}>
            <UploadSimpleIcon aria-hidden="true" />
            {c.uploadNew}
          </Button>
        ) : null}
      </div>
      {isAdmin ? (
        <input
          ref={input}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="sr-only"
          aria-label={c.upload}
          tabIndex={-1}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      ) : null}

      {upload.state === "validating" ? (
        <p
          role="status"
          className="rounded-lg border border-line bg-surface p-5 text-small text-muted"
        >
          {c.checking}
        </p>
      ) : null}
      {upload.state === "preview" || upload.state === "saving" ? (
        <>
          {failed ? (
            <p role="alert" className="flex items-center gap-2 text-small text-bad">
              <WarningCircleIcon aria-hidden="true" className="size-4" />
              {c.saveFailed}
            </p>
          ) : null}
          <Preview
            upload={upload}
            nextNumber={nextNumber}
            onSave={() => void onSave()}
            onChooseAnother={chooseFile}
            onCancel={() => setUpload({ state: "idle" })}
          />
        </>
      ) : null}

      {versions.length === 0 && upload.state === "idle" ? (
        <div className="grid max-w-[480px] justify-items-start gap-4 py-12">
          <p className="text-body text-muted">{isAdmin ? c.emptyAdmin : c.noneYetMember}</p>
          {isAdmin ? (
            <Button onClick={chooseFile}>
              <UploadSimpleIcon aria-hidden="true" />
              {c.upload}
            </Button>
          ) : null}
        </div>
      ) : null}

      {versions.length > 0 ? (
        <Tabs defaultValue="versions">
          <TabsList>
            <TabsTrigger value="versions">{c.versions}</TabsTrigger>
            <TabsTrigger value="candidates">{c.candidates}</TabsTrigger>
          </TabsList>
          <TabsContent value="versions" className="pt-4">
            <Versions versions={versions} />
          </TabsContent>
          <TabsContent value="candidates" className="pt-4">
            <p className="max-w-[560px] text-small text-muted">{c.candidatesEmpty}</p>
          </TabsContent>
        </Tabs>
      ) : null}
    </main>
  );
}
