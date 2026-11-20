"use client";

import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOnline } from "@/hooks/useOnline";
import type { ActionResult } from "@/lib/actions/result";
import type { CoachOutput } from "@/lib/ai/schemas";
import { missingForApproval } from "@/lib/intake/approve-rules";
import {
  COACHED_FIELDS,
  FIELD_MAX,
  FIGMA_LINK,
  SECTORS,
  type CoachedField as Field,
  type IntakeField,
} from "@/lib/schemas/intake";
import type { UploadKind } from "@/lib/uploads/rules";
import type { UploadRow } from "@/lib/uploads/service";
import { CoachedField, type CoachState } from "./CoachedField";
import { intakeCopy as c, ethicsCopy } from "./copy";
import { EthicsPanel, type EthicsView } from "./EthicsPanel";
import { UploadList } from "./UploadList";
import { AddEmailDialog, type AddEmailFns } from "@/components/email/AddEmailDialog";
import { emailCopy } from "@/components/email/copy";
import type { EmailRow } from "@/lib/email/service";
import { competitorLines, MAX_COMPETITORS } from "@/lib/schemas/intake";

export type BriefActions = {
  saveField: (input: {
    projectId: string;
    field: IntakeField;
    value: string;
    version: number;
  }) => Promise<ActionResult<{ version: number }>>;
  coach: (input: {
    projectId: string;
    field: Field;
    text: string;
  }) => Promise<ActionResult<CoachOutput>>;
  resolve: (input: {
    projectId: string;
    field: Field;
    action: "use" | "edit" | "keep";
    value: string;
    lowSpecificity: boolean;
    version: number;
  }) => Promise<ActionResult<{ version: number; lowSpecificity: boolean }>>;
  uploadFile: (kind: UploadKind, file: File) => Promise<ActionResult<UploadRow>>;
  removeFile: (id: string) => Promise<ActionResult>;
  /** Phase 1: emails are added and removed here for email projects (AC31.2). */
  addEmail?: AddEmailFns;
  removeEmail?: (emailId: string) => Promise<ActionResult>;
  approve: (projectId: string) => Promise<ActionResult<{ stageRunId: string }>>;
  editIntake: (projectId: string) => Promise<ActionResult>;
  override: (
    projectId: string,
    nodeId: string,
    reason: string,
  ) => Promise<ActionResult<{ overrideId: string }>>;
  retryEthics: (projectId: string) => Promise<ActionResult<{ stageRunId: string }>>;
  archive: (projectId: string) => Promise<ActionResult>;
};

export type BriefData = {
  project: {
    id: string;
    name: string;
    mode: "new" | "optimise";
    channel: "screens" | "email";
    status: string;
  };
  intake: {
    version: number;
    values: Record<IntakeField, string>;
    lowSpecificity: Record<string, boolean>;
    approved: null | { by: string; at: string };
  };
  uploads: UploadRow[];
  /** Emails added to this project (phase 1, AC31.2). */
  emails?: EmailRow[];
  ethics: EthicsView | null;
};

type SaveState = "idle" | "saving" | "saved" | "failed";

/** SCR6 Brief (AC8.1–AC8.9, AC9.1–AC9.3, AC10.x, AC26.x). */
export function BriefPage({ data, actions }: { data: BriefData; actions: BriefActions }) {
  const router = useRouter();
  const online = useOnline();
  const { project } = data;
  const [values, setValues] = useState(data.intake.values);
  const [low, setLow] = useState(data.intake.lowSpecificity);
  const [uploads, setUploads] = useState(data.uploads);
  const [coach, setCoach] = useState<Partial<Record<Field, CoachState>>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [figmaError, setFigmaError] = useState(false);
  const [approving, setApproving] = useState(false);
  const [refused, setRefused] = useState(project.status === "blocked");
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmEdit, setConfirmEdit] = useState(false);

  const version = useRef(data.intake.version);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const timers = useRef<Partial<Record<IntakeField, ReturnType<typeof setTimeout>>>>({});
  const lastCoached = useRef<Partial<Record<Field, string>>>({});
  const retry = useRef<() => void>(() => undefined);
  const fieldRefs = useRef<Partial<Record<Field, HTMLTextAreaElement | null>>>({});

  // Saves run one after another so each carries the version the last one returned.
  function enqueue<T>(job: () => Promise<T>): Promise<T> {
    const next = queue.current.then(job, job);
    queue.current = next.catch(() => undefined);
    return next;
  }

  function save(field: IntakeField, value: string) {
    clearTimeout(timers.current[field]);
    setSaveState("saving");
    return enqueue(async () => {
      const res = await actions
        .saveField({ projectId: project.id, field, value, version: version.current })
        .catch(() => null);
      if (res?.ok) {
        version.current = res.data.version;
        setSaveState("saved");
      } else {
        retry.current = () => void save(field, value);
        setSaveState("failed");
      }
    });
  }

  function change(field: IntakeField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    clearTimeout(timers.current[field]);
    timers.current[field] = setTimeout(() => void save(field, value), 1200); // AC8.9: within 2 s
  }

  async function blurCoach(field: Field) {
    const text = values[field].trim();
    if (timers.current[field]) await save(field, values[field]);
    if (text.length < 10 || lastCoached.current[field] === text) return;
    lastCoached.current[field] = text;
    setCoach((s) => ({ ...s, [field]: { status: "loading" } }));
    const res = await actions.coach({ projectId: project.id, field, text }).catch(() => null);
    setCoach((s) => ({
      ...s,
      [field]: res?.ok ? { status: "suggestion", output: res.data } : { status: "unavailable" },
    }));
  }

  async function resolve(field: Field, action: "use" | "edit" | "keep") {
    const state = coach[field];
    if (state?.status !== "suggestion") return;
    clearTimeout(timers.current[field]);
    const value = action === "keep" ? values[field] : state.output.suggestion;
    setValues((v) => ({ ...v, [field]: value }));
    setCoach((s) => ({ ...s, [field]: { status: "idle" } }));
    lastCoached.current[field] = value.trim();
    setSaveState("saving");
    await enqueue(async () => {
      const res = await actions
        .resolve({
          projectId: project.id,
          field,
          action,
          value,
          lowSpecificity: state.output.lowSpecificity,
          version: version.current,
        })
        .catch(() => null);
      if (res?.ok) {
        version.current = res.data.version;
        setLow((l) => ({ ...l, [field]: res.data.lowSpecificity }));
        setSaveState("saved");
      } else {
        retry.current = () => void save(field, value);
        setSaveState("failed");
      }
    });
    if (action === "edit") fieldRefs.current[field]?.focus();
  }

  // While the ethics check runs, refresh the page data until it finishes.
  const running = data.ethics?.state === "running";
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => router.refresh(), 1500);
    return () => clearInterval(id);
  }, [running, router]);

  const assets = uploads.filter((u) => u.kind === "asset");
  const emails = data.emails ?? [];
  const isEmailProject = project.channel === "email";
  const [addingEmail, setAddingEmail] = useState(false);
  const missing = missingForApproval(
    {
      business_objective: values.business_objective,
      behavioural_objective: values.behavioural_objective,
      sector: values.sector,
      sector_other: values.sector_other,
    },
    project.mode,
    assets.length,
    isEmailProject ? emails.length : undefined,
  );
  const missingMessages = [
    ...(missing.includes("business_objective") || missing.includes("behavioural_objective")
      ? [c.needsObjectives]
      : []),
    ...(missing.includes("sector") ? [c.needsSector] : []),
    ...(missing.includes("assets") ? [isEmailProject ? emailCopy.needsEmails : c.needsAssets] : []),
  ];
  const approved = data.intake.approved;

  async function approve() {
    setApproving(true);
    setActionError(null);
    await queue.current;
    const res = await actions.approve(project.id).catch(() => null);
    setApproving(false);
    if (res?.ok) router.refresh();
    else if (res && !res.ok && res.code === "forbidden") setRefused(true);
    else setActionError(c.saveFailed);
  }

  async function reopen() {
    setConfirmEdit(false);
    const res = await actions.editIntake(project.id).catch(() => null);
    if (res?.ok) router.refresh();
    else setActionError(c.saveFailed);
  }

  return (
    <main className="mx-auto grid w-full max-w-[680px] gap-8 px-6 py-11">
      <header className="grid gap-1">
        <h2 className="text-panel font-semibold tracking-tight">{c.title}</h2>
        <p aria-live="polite" className="h-5 text-caption text-muted">
          {saveState === "saving" ? c.saving : saveState === "saved" ? c.saved : null}
        </p>
      </header>

      {!online ? (
        <p
          role="status"
          className="rounded-sm border border-warn bg-warn-bg p-3 text-small text-warn"
        >
          {c.offline}
        </p>
      ) : null}
      {saveState === "failed" ? (
        <div role="alert" className="flex items-center gap-3 text-small text-bad">
          <WarningCircleIcon aria-hidden="true" className="size-4" />
          {c.saveFailed}
          <Button variant="secondary" size="sm" onClick={() => retry.current()}>
            {c.tryAgain}
          </Button>
        </div>
      ) : null}

      {refused ? (
        <section
          role="alert"
          className="grid justify-items-start gap-3 rounded-lg border border-line bg-bad-bg p-5"
        >
          <p className="text-body text-bad">{ethicsCopy.refusedSector}</p>
          <Button
            variant="secondary"
            onClick={async () => {
              const res = await actions.archive(project.id).catch(() => null);
              if (res?.ok) router.push("/projects");
            }}
          >
            {ethicsCopy.archive}
          </Button>
        </section>
      ) : null}

      {approved ? (
        <>
          <section aria-label={c.title} className="grid gap-5">
            {COACHED_FIELDS.map((f) =>
              values[f] ? (
                <div key={f} className="grid gap-1">
                  <p className="text-caption font-medium text-muted">{c.fields[f].label}</p>
                  <p className="text-body">{values[f]}</p>
                </div>
              ) : null,
            )}
            <div className="grid gap-1">
              <p className="text-caption font-medium text-muted">{c.sectorLabel}</p>
              <p className="text-body">
                {values.sector === "Other" ? values.sector_other : values.sector}
              </p>
            </div>
            {values.competitors.trim() ? (
              <div className="grid gap-1">
                <p className="text-caption font-medium text-muted">{c.competitorsLabel}</p>
                <p className="whitespace-pre-line text-body">{values.competitors}</p>
              </div>
            ) : null}
            {emails.length ? (
              <div className="grid gap-1">
                <p className="text-caption font-medium text-muted">{emailCopy.section}</p>
                <ul className="grid gap-1 text-small text-muted">
                  {emails.map((e) => (
                    <li key={e.id}>{e.subject}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {uploads.length ? (
              <ul className="grid gap-1 text-small text-muted">
                {uploads.map((u) => (
                  <li key={u.id}>{u.fileName}</li>
                ))}
              </ul>
            ) : null}
            <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
              <p className="text-small text-muted">{c.approvedBy(approved.by, approved.at)}</p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setConfirmEdit(true)}>
                  {c.editBrief}
                </Button>
                <Button asChild>
                  <Link href={`/projects/${project.id}`}>{c.goToCanvas}</Link>
                </Button>
              </div>
            </div>
          </section>
          {data.ethics ? (
            <EthicsPanel
              view={data.ethics}
              onEditBrief={() => setConfirmEdit(true)}
              onRetry={async () => {
                const res = await actions.retryEthics(project.id).catch(() => null);
                if (res?.ok) router.refresh();
              }}
              onOverride={async (nodeId, reason) => {
                const res = await actions.override(project.id, nodeId, reason).catch(() => null);
                if (res?.ok) {
                  router.refresh();
                  return true;
                }
                setActionError(c.saveFailed);
                return false;
              }}
            />
          ) : null}
          <Dialog open={confirmEdit} onOpenChange={setConfirmEdit}>
            <DialogContent>
              <DialogTitle className="mb-2">{c.editBrief}</DialogTitle>
              <DialogDescription>{c.editWarnsStale}</DialogDescription>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setConfirmEdit(false)}>
                  {c.cancel}
                </Button>
                <Button onClick={() => void reopen()}>{c.editConfirm}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <form className="grid gap-7" noValidate onSubmit={(e) => e.preventDefault()}>
          {COACHED_FIELDS.map((f) => (
            <CoachedField
              key={f}
              field={f}
              value={values[f]}
              maxLength={FIELD_MAX[f]}
              coach={coach[f] ?? { status: "idle" }}
              lowSpecificity={Boolean(low[f])}
              textareaRef={(el) => {
                fieldRefs.current[f] = el;
              }}
              onChange={(v) => change(f, v)}
              onBlur={() => void blurCoach(f)}
              onUse={() => void resolve(f, "use")}
              onEdit={() => void resolve(f, "edit")}
              onKeep={() => void resolve(f, "keep")}
            />
          ))}

          <div className="grid gap-1.5">
            <Label htmlFor="intake-sector">{c.sectorLabel}</Label>
            <select
              id="intake-sector"
              value={values.sector}
              onChange={(e) => {
                setValues((v) => ({ ...v, sector: e.target.value }));
                void save("sector", e.target.value);
              }}
              className="h-9 w-72 rounded-sm border border-line-strong bg-surface px-2.5 text-small"
            >
              <option value="">{c.sectorPlaceholder}</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {values.sector === "Other" ? (
              <div className="mt-2 grid w-72 gap-1.5">
                <Label htmlFor="intake-sector-other">{c.sectorOther}</Label>
                <Input
                  id="intake-sector-other"
                  value={values.sector_other}
                  maxLength={80}
                  onChange={(e) => change("sector_other", e.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="intake-competitors">{c.competitorsLabel}</Label>
            <Textarea
              id="intake-competitors"
              rows={3}
              value={values.competitors}
              maxLength={500}
              aria-invalid={
                competitorLines(values.competitors).length > MAX_COMPETITORS || undefined
              }
              aria-describedby="intake-competitors-help"
              onChange={(e) => {
                const v = e.target.value;
                setValues((cur) => ({ ...cur, competitors: v }));
                clearTimeout(timers.current.competitors);
                if (competitorLines(v).length <= MAX_COMPETITORS)
                  timers.current.competitors = setTimeout(() => void save("competitors", v), 1200);
              }}
            />
            <p
              id="intake-competitors-help"
              className={
                competitorLines(values.competitors).length > MAX_COMPETITORS
                  ? "text-caption text-bad"
                  : "text-caption text-muted"
              }
            >
              {competitorLines(values.competitors).length > MAX_COMPETITORS
                ? c.competitorsTooMany
                : c.competitorsHelp}
            </p>
          </div>

          {isEmailProject ? (
            <section className="grid gap-3 rounded-lg border border-line p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-small font-semibold">{emailCopy.section}</h3>
                {actions.addEmail ? (
                  <Button variant="secondary" size="sm" onClick={() => setAddingEmail(true)}>
                    {emailCopy.add}
                  </Button>
                ) : null}
              </div>
              <p className="text-caption text-muted">{emailCopy.help}</p>
              {emails.length ? (
                <ul className="grid gap-1">
                  {emails.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-3 rounded-sm bg-soft px-3 py-2 text-small"
                    >
                      <span className="min-w-0 truncate">{e.subject}</span>
                      {actions.removeEmail ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${emailCopy.remove}: ${e.subject}`}
                          onClick={async () => {
                            await actions.removeEmail!(e.id).catch(() => null);
                            router.refresh();
                          }}
                        >
                          {emailCopy.remove}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-small text-muted">{emailCopy.empty}</p>
              )}
              {actions.addEmail ? (
                <AddEmailDialog
                  open={addingEmail}
                  onOpenChange={setAddingEmail}
                  fns={actions.addEmail}
                  onAdded={() => router.refresh()}
                />
              ) : null}
            </section>
          ) : null}

          {project.mode === "optimise" && !isEmailProject ? (
            <section className="grid gap-4 rounded-lg border border-line p-5">
              <UploadList
                kind="asset"
                channel={project.channel}
                label={c.assetsLabel}
                help={project.channel === "email" ? c.assetsHelpEmail : c.assetsHelpScreens}
                files={assets}
                uploadFile={actions.uploadFile}
                removeFile={actions.removeFile}
                onChange={(list) =>
                  setUploads([...list, ...uploads.filter((u) => u.kind !== "asset")])
                }
              />
              {project.channel === "screens" ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="intake-figma">{c.figmaLabel}</Label>
                  <Input
                    id="intake-figma"
                    value={values.figma_link}
                    placeholder="https://www.figma.com/design/…"
                    aria-invalid={figmaError || undefined}
                    aria-describedby={figmaError ? "intake-figma-error" : undefined}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, figma_link: e.target.value }));
                      setFigmaError(false);
                    }}
                    onBlur={() => {
                      const v = values.figma_link.trim();
                      if (v && !FIGMA_LINK.test(v)) setFigmaError(true);
                      else void save("figma_link", v);
                    }}
                  />
                  {figmaError ? (
                    <p id="intake-figma-error" className="text-caption text-bad">
                      {c.figmaLinkInvalid}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="grid gap-3">
            <UploadList
              kind="client_data"
              channel={project.channel}
              label={c.clientDataLabel}
              help={c.clientDataHelp}
              files={uploads.filter((u) => u.kind === "client_data")}
              uploadFile={actions.uploadFile}
              removeFile={actions.removeFile}
              onChange={(list) =>
                setUploads([...uploads.filter((u) => u.kind !== "client_data"), ...list])
              }
            />
            <p className="text-caption text-muted">{c.uploadPrivacyHint}</p>
          </section>

          <div className="grid gap-3 border-t border-line pt-6">
            {missingMessages.map((m) => (
              <p key={m} className="text-small text-muted">
                {m}
              </p>
            ))}
            {actionError ? (
              <p role="alert" className="text-small text-bad">
                {actionError}
              </p>
            ) : null}
            <div>
              <Button
                loading={approving}
                loadingLabel={c.approving}
                disabledReason={missingMessages[0] ?? (!online ? c.offline : undefined)}
                onClick={() => void approve()}
              >
                {c.approve}
              </Button>
            </div>
          </div>
        </form>
      )}
    </main>
  );
}
