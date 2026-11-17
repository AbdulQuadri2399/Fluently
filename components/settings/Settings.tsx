"use client";

import { WarningCircleIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/actions/result";
import { formatGbp } from "@/lib/ai/cost";
import { AI_STAGES, EFFORTS, MODELS, type StageModels } from "@/lib/ai/models";
import { allowEntrySchema, type WorkspaceSettingsInput } from "@/lib/schemas/settings";
import type { AllowEntry, MemberRow, UsageRow, WorkspaceSettings } from "@/lib/settings/service";
import { cn } from "@/lib/utils";
import { aiStageNames, effortNames, modelNames, settingsCopy as c } from "./copy";

export type SettingsActions = {
  updateWorkspaceSettings: (input: WorkspaceSettingsInput) => Promise<ActionResult>;
  addAllowEntry: (input: { value: string }) => Promise<ActionResult<AllowEntry>>;
  removeAllowEntry: (id: string) => Promise<ActionResult>;
  setMemberRole: (id: string, role: "admin" | "member") => Promise<ActionResult>;
  setMemberActive: (id: string, active: boolean) => Promise<ActionResult>;
};

type AdminData = {
  settings: WorkspaceSettings;
  allowlist: AllowEntry[];
  members: MemberRow[];
};

const SECTIONS_ADMIN = [
  ["allowlist", c.allowlist],
  ["members", c.members],
  ["models", c.models],
  ["budget", c.budget],
  ["services", c.services],
  ["sectors", c.sectors],
  ["usage", c.usage],
] as const;

function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-center gap-2 text-small text-bad">
      <WarningCircleIcon aria-hidden="true" className="size-4 shrink-0" />
      {children}
    </p>
  );
}

function Section({
  id,
  title,
  help,
  children,
}: {
  id: string;
  title: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-11 gap-4">
      <div className="grid gap-1">
        <h2 id={`${id}-title`} className="text-panel font-semibold tracking-tight">
          {title}
        </h2>
        {help ? <p className="max-w-[560px] text-small text-muted">{help}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Runs a save and reports it the same way everywhere: "Saving…", toast "Saved.", or an inline error. */
function useSave() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<ActionResult<unknown>>, codes: Record<string, string> = {}) {
    setSaving(true);
    setError(null);
    try {
      const res = await fn();
      if (res.ok) {
        toast(c.saved);
        router.refresh();
        return true;
      }
      setError(codes[res.code] ?? c.saveFailed);
    } catch {
      setError(c.saveFailed);
    } finally {
      setSaving(false);
    }
    return false;
  }
  return { saving, error, setError, run };
}

function SaveRow({
  saving,
  error,
  onSave,
}: {
  saving: boolean;
  error: string | null;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <Button variant="secondary" loading={saving} loadingLabel={c.saving} onClick={onSave}>
        {c.save}
      </Button>
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}

function Allowlist({ entries, actions }: { entries: AllowEntry[]; actions: SettingsActions }) {
  const [value, setValue] = useState("");
  const { saving, error, setError, run } = useSave();
  const [rows, setRows] = useState(entries);

  async function add() {
    if (!allowEntrySchema.safeParse({ value }).success) {
      setError(c.invalidAllowEntry);
      return;
    }
    let added: AllowEntry | null = null;
    const okay = await run(
      async () => {
        const res = await actions.addAllowEntry({ value });
        if (res.ok) added = res.data;
        return res;
      },
      { validation: c.invalidAllowEntry },
    );
    if (okay && added) {
      const entry: AllowEntry = added;
      setRows((r) => (r.some((x) => x.id === entry.id) ? r : [...r, entry]));
      setValue("");
    }
  }

  return (
    <Section id="allowlist" title={c.allowlist} help={c.allowlistHelp}>
      <form
        className="flex max-w-[560px] items-start gap-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="allow-entry" className="sr-only">
            {c.allowlistLabel}
          </Label>
          <Input
            id="allow-entry"
            value={value}
            placeholder={c.allowlistPlaceholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "allow-entry-error" : undefined}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
          />
          {error ? (
            <p id="allow-entry-error" className="text-caption text-bad">
              {error}
            </p>
          ) : null}
        </div>
        <Button type="submit" variant="secondary" loading={saving} loadingLabel={c.saving}>
          {c.add}
        </Button>
      </form>
      {rows.length === 0 ? (
        <p className="text-small text-muted">{c.allowlistEmpty}</p>
      ) : (
        <ul className="max-w-[560px] border-t border-line">
          {rows.map((e) => (
            <li key={e.id} className="flex h-11 items-center gap-3 border-b border-line text-small">
              <span className="flex-1 truncate font-mono text-[12.5px]">{e.value}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`${c.remove} ${e.value}`}
                onClick={async () => {
                  const res = await actions.removeAllowEntry(e.id).catch(() => null);
                  if (res?.ok) {
                    setRows((r) => r.filter((x) => x.id !== e.id));
                    toast(c.saved);
                  } else toast.error(c.saveFailed);
                }}
              >
                {c.remove}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Members({
  members,
  meId,
  actions,
}: {
  members: MemberRow[];
  meId: string;
  actions: SettingsActions;
}) {
  const { error, run } = useSave();
  const [confirm, setConfirm] = useState<MemberRow | null>(null);
  const codes = { conflict: c.lastAdmin };
  return (
    <Section id="members" title={c.members}>
      {error ? <Alert>{error}</Alert> : null}
      <ul className="max-w-[720px] border-t border-line">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex min-h-12 items-center gap-3 border-b border-line py-2 text-small"
          >
            <div className="grid min-w-0 flex-1">
              <span className={cn("truncate", !m.active && "text-muted")}>
                {m.displayName ?? m.email}
                {m.id === meId ? <span className="ml-2 text-muted">({c.you})</span> : null}
              </span>
              {m.displayName ? (
                <span className="truncate text-caption text-muted">{m.email}</span>
              ) : null}
            </div>
            {m.active ? null : <Badge kind="status">{c.deactivated}</Badge>}
            <Badge>{m.role === "admin" ? c.roleAdmin : c.roleMember}</Badge>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`${m.role === "admin" ? c.makeMember : c.makeAdmin}: ${m.email}`}
              onClick={() =>
                void run(
                  () => actions.setMemberRole(m.id, m.role === "admin" ? "member" : "admin"),
                  codes,
                )
              }
            >
              {m.role === "admin" ? c.makeMember : c.makeAdmin}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`${m.active ? c.deactivate : c.reactivate}: ${m.email}`}
              onClick={() =>
                m.active
                  ? setConfirm(m)
                  : void run(() => actions.setMemberActive(m.id, true), codes)
              }
            >
              {m.active ? c.deactivate : c.reactivate}
            </Button>
          </li>
        ))}
      </ul>
      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogTitle className="mb-2">{c.deactivate}</DialogTitle>
          <DialogDescription>
            {confirm ? c.deactivateConfirm(confirm.email) : null}
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {c.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const target = confirm;
                setConfirm(null);
                if (target) void run(() => actions.setMemberActive(target.id, false), codes);
              }}
            >
              {c.deactivate}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

const selectClass =
  "h-9 rounded-sm border border-line-strong bg-surface px-2.5 text-small text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function Models({ initial, actions }: { initial: StageModels; actions: SettingsActions }) {
  const [models, setModels] = useState(initial);
  const { saving, error, run } = useSave();
  return (
    <Section id="models" title={c.models} help={c.modelsHelp}>
      <table className="w-full max-w-[720px] border-collapse text-small">
        <thead>
          <tr className="border-b border-line text-left text-caption text-muted">
            <th className="py-2 pr-4 font-medium">{c.colStage}</th>
            <th className="py-2 pr-4 font-medium">{c.colModel}</th>
            <th className="py-2 font-medium">{c.colEffort}</th>
          </tr>
        </thead>
        <tbody>
          {AI_STAGES.map((s) => (
            <tr key={s} className="border-b border-line">
              <td className="py-2 pr-4">{aiStageNames[s]}</td>
              <td className="py-2 pr-4">
                <select
                  aria-label={`${c.colModel}: ${aiStageNames[s]}`}
                  className={selectClass}
                  value={models[s].model}
                  onChange={(e) =>
                    setModels({
                      ...models,
                      [s]: { ...models[s], model: e.target.value as (typeof MODELS)[number] },
                    })
                  }
                >
                  {MODELS.map((m) => (
                    <option key={m} value={m}>
                      {modelNames[m]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2">
                <select
                  aria-label={`${c.colEffort}: ${aiStageNames[s]}`}
                  className={selectClass}
                  value={models[s].effort}
                  onChange={(e) =>
                    setModels({
                      ...models,
                      [s]: { ...models[s], effort: e.target.value as (typeof EFFORTS)[number] },
                    })
                  }
                >
                  {EFFORTS.map((x) => (
                    <option key={x} value={x}>
                      {effortNames[x]}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <SaveRow
        saving={saving}
        error={error}
        onSave={() => void run(() => actions.updateWorkspaceSettings({ stageModels: models }))}
      />
    </Section>
  );
}

function Budget({ initial, actions }: { initial: WorkspaceSettings; actions: SettingsActions }) {
  const [cap, setCap] = useState(String(initial.costCapGbp));
  const [rate, setRate] = useState(String(initial.gbpPerUsd));
  const { saving, error, setError, run } = useSave();
  function save() {
    const capN = Number(cap);
    const rateN = Number(rate);
    if (!(capN >= 1 && capN <= 500)) return setError(c.capInvalid);
    if (!(rateN >= 0.1 && rateN <= 5)) return setError(c.rateInvalid);
    void run(() => actions.updateWorkspaceSettings({ costCapGbp: capN, gbpPerUsd: rateN }));
  }
  return (
    <Section id="budget" title={c.budget} help={c.budgetHelp}>
      <div className="flex gap-4">
        <div className="grid w-56 gap-1.5">
          <Label htmlFor="cost-cap">{c.capLabel}</Label>
          <Input
            id="cost-cap"
            inputMode="decimal"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
          />
        </div>
        <div className="grid w-56 gap-1.5">
          <Label htmlFor="gbp-rate">{c.rateLabel}</Label>
          <Input
            id="gbp-rate"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      </div>
      <SaveRow saving={saving} error={error} onSave={save} />
    </Section>
  );
}

function ListEditor({
  id,
  label,
  items,
  onChange,
}: {
  id: string;
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (!v) return;
    if (!items.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...items, v]);
    setDraft("");
  }
  return (
    <div className="grid max-w-[560px] gap-2">
      <Label htmlFor={id}>{label}</Label>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex h-7 items-center gap-1 rounded-sm border border-line bg-surface pr-1 pl-2.5 text-small"
          >
            {item}
            <button
              type="button"
              aria-label={`${c.remove} ${item}`}
              className="grid size-5 place-items-center rounded-xs text-muted hover:bg-soft hover:text-ink"
              onClick={() => onChange(items.filter((x) => x !== item))}
            >
              <XIcon aria-hidden="true" className="size-3" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={c.itemPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="ghost" onClick={add}>
          {c.addItem}
        </Button>
      </div>
    </div>
  );
}

function Services({ initial, actions }: { initial: string[]; actions: SettingsActions }) {
  const [items, setItems] = useState(initial);
  const { saving, error, run } = useSave();
  return (
    <Section id="services" title={c.services} help={c.servicesHelp}>
      <ListEditor id="services-input" label={c.services} items={items} onChange={setItems} />
      <SaveRow
        saving={saving}
        error={error}
        onSave={() => void run(() => actions.updateWorkspaceSettings({ agencyServices: items }))}
      />
    </Section>
  );
}

function Sectors({ initial, actions }: { initial: WorkspaceSettings; actions: SettingsActions }) {
  const [flag, setFlag] = useState(initial.sectorFlagList);
  const [refuse, setRefuse] = useState(initial.sectorRefuseList);
  const { saving, error, run } = useSave();
  return (
    <Section id="sectors" title={c.sectors} help={c.sectorsHelp}>
      <ListEditor id="flag-input" label={c.flagList} items={flag} onChange={setFlag} />
      <ListEditor id="refuse-input" label={c.refuseList} items={refuse} onChange={setRefuse} />
      <SaveRow
        saving={saving}
        error={error}
        onSave={() =>
          void run(() =>
            actions.updateWorkspaceSettings({ sectorFlagList: flag, sectorRefuseList: refuse }),
          )
        }
      />
    </Section>
  );
}

export function Usage({ rows }: { rows: UsageRow[] }) {
  const total = rows.reduce((sum, r) => sum + r.costGbp, 0);
  return (
    <Section id="usage" title={c.usage} help={c.usageHelp}>
      {rows.length === 0 ? (
        <p className="text-small text-muted">{c.usageEmpty}</p>
      ) : (
        <table className="w-full max-w-[720px] border-collapse text-small">
          <thead>
            <tr className="border-b border-line text-left text-caption text-muted">
              <th className="py-2 pr-4 font-medium">{c.colProject}</th>
              <th className="py-2 pr-4 font-medium">{c.colStage}</th>
              <th className="py-2 pr-4 text-right font-medium">{c.colCalls}</th>
              <th className="py-2 text-right font-medium">{c.colCost}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.projectId}|${r.stage}`} className="border-b border-line">
                <td className="py-2.5 pr-4">{r.projectName}</td>
                <td className="py-2.5 pr-4 text-muted">{aiStageNames[r.stage] ?? r.stage}</td>
                <td className="py-2.5 pr-4 text-right font-mono text-[12.5px]">{r.calls}</td>
                <td className="py-2.5 text-right font-mono text-[12.5px]">
                  {formatGbp(r.costGbp)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-2.5 pr-4 font-medium" colSpan={3}>
                {c.total}
              </td>
              <td className="py-2.5 text-right font-mono text-[12.5px] font-medium">
                {formatGbp(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </Section>
  );
}

/** SCR12 Workspace settings (AC3.1–AC3.6, AC10.4, AC13.3, AC27.2, AC28.1). Members see usage only. */
export function SettingsPage({
  meId,
  admin,
  usage,
  actions,
}: {
  meId: string;
  admin: AdminData | null;
  usage: UsageRow[];
  actions: SettingsActions;
}) {
  const sections = admin ? SECTIONS_ADMIN : ([["usage", c.usage]] as const);
  return (
    <div className="mx-auto flex w-full max-w-[1040px] gap-14 px-14 py-11">
      <nav aria-label={c.title} className="sticky top-11 h-fit w-44 shrink-0">
        <h1 className="mb-5 text-page font-semibold tracking-[-0.03em]">{c.title}</h1>
        <ul className="grid gap-0.5">
          {sections.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="flex h-8 items-center rounded-sm px-2 text-small text-muted hover:bg-soft hover:text-ink"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <main className="grid min-w-0 flex-1 gap-14 pt-16">
        {admin ? (
          <>
            <Allowlist entries={admin.allowlist} actions={actions} />
            <Members members={admin.members} meId={meId} actions={actions} />
            <Models initial={admin.settings.stageModels} actions={actions} />
            <Budget initial={admin.settings} actions={actions} />
            <Services initial={admin.settings.agencyServices} actions={actions} />
            <Sectors initial={admin.settings} actions={actions} />
          </>
        ) : null}
        <Usage rows={usage} />
      </main>
    </div>
  );
}
