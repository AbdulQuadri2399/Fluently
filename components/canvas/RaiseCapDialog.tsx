"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canvasCopy as c } from "./copy";

/** O31 raise the project's AI budget (admins, AC27.4). Research carries on once saved. */
export function RaiseCapDialog({
  open,
  onOpenChange,
  spentGbp,
  capGbp,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spentGbp: number;
  capGbp: number;
  onSave: (capGbp: number) => Promise<boolean>;
}) {
  const [value, setValue] = useState(String(Math.ceil(capGbp * 2)));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const amount = Number(value);
  const invalid = !Number.isFinite(amount) || amount <= spentGbp || amount > 1000;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid gap-4">
        <DialogTitle className="text-panel font-semibold tracking-tight">
          {c.budget.raiseTitle}
        </DialogTitle>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (invalid) return;
            setBusy(true);
            const ok = await onSave(amount);
            setBusy(false);
            setFailed(!ok);
            if (ok) onOpenChange(false);
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="raise-cap">{c.budget.raiseLabel}</Label>
            <Input
              id="raise-cap"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={invalid}
              aria-describedby="raise-cap-help"
            />
            <DialogDescription id="raise-cap-help" className="text-caption text-muted">
              {invalid ? c.budget.raiseInvalid : c.budget.raiseHelp}
            </DialogDescription>
            {failed ? <p className="text-caption text-bad">{c.edit.saveFailed}</p> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {c.edit.cancel}
            </Button>
            <Button
              type="submit"
              loading={busy}
              loadingLabel={c.budget.saving}
              disabledReason={invalid ? c.budget.raiseInvalid : undefined}
            >
              {c.budget.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
