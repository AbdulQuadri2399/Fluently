"use client";

import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/actions/result";
import type { UpdateProjectInput } from "@/lib/schemas/project";
import { cn } from "@/lib/utils";
import { projectsCopy as c } from "./copy";

export type ProjectMenuActions = {
  update: (input: UpdateProjectInput) => Promise<ActionResult>;
  archive: (id: string) => Promise<ActionResult>;
  restore: (id: string) => Promise<ActionResult>;
  remove: (id: string, confirmName: string) => Promise<ActionResult>;
};

/**
 * AC7.6–AC7.8: the "…" menu on a projects-list row and in the project header. Rename and
 * archive for everyone; Delete only for admins (the server checks too).
 */
export function ProjectMenu({
  project,
  archived,
  isAdmin,
  actions,
  onChanged,
  onArchived,
  onDeleted,
  className,
}: {
  project: { id: string; name: string; clientLabel: string | null };
  archived: boolean;
  isAdmin: boolean;
  actions: ProjectMenuActions;
  onChanged?: () => void;
  onArchived?: (archived: boolean) => void;
  onDeleted?: () => void;
  className?: string;
}) {
  const [dialog, setDialog] = useState<null | "rename" | "delete">(null);

  async function toggleArchive() {
    const res = archived ? await actions.restore(project.id) : await actions.archive(project.id);
    if (!res.ok) {
      toast.error(c.saveFailed);
      return;
    }
    toast(archived ? c.restored : c.archived);
    onArchived?.(!archived);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={c.menu(project.name)}
            className={cn("size-8", className)}
          >
            <DotsThreeIcon aria-hidden="true" weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog("rename")}>{c.rename}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void toggleArchive()}>
            {archived ? c.restore : c.archive}
          </DropdownMenuItem>
          {isAdmin ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-bad" onSelect={() => setDialog("delete")}>
                {c.delete}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === "rename" ? (
        <RenameDialog
          project={project}
          onClose={() => setDialog(null)}
          save={actions.update}
          onSaved={() => {
            toast(c.renamed);
            onChanged?.();
          }}
        />
      ) : null}
      {dialog === "delete" ? (
        <DeleteDialog
          project={project}
          onClose={() => setDialog(null)}
          remove={actions.remove}
          onDeleted={() => {
            toast(c.deleted);
            onDeleted?.();
          }}
        />
      ) : null}
    </>
  );
}

function RenameDialog({
  project,
  onClose,
  save,
  onSaved,
}: {
  project: { id: string; name: string; clientLabel: string | null };
  onClose: () => void;
  save: ProjectMenuActions["update"];
  onSaved: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [client, setClient] = useState(project.clientLabel ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalid = name.trim().length === 0 || name.trim().length > 80;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="grid gap-4">
        <DialogTitle className="text-panel font-semibold tracking-tight">
          {c.renameTitle}
        </DialogTitle>
        <DialogDescription className="sr-only">{c.renameTitle}</DialogDescription>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (invalid) {
              setError(c.nameInvalid);
              return;
            }
            setBusy(true);
            const res = await save({ id: project.id, name, clientLabel: client });
            setBusy(false);
            if (!res.ok) {
              setError(res.code === "validation" ? c.nameInvalid : c.saveFailed);
              return;
            }
            onSaved();
            onClose();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="rename-name">{c.name}</Label>
            <Input
              id="rename-name"
              value={name}
              maxLength={120}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "rename-error" : undefined}
            />
            {error ? (
              <p id="rename-error" className="text-caption text-bad">
                {error}
              </p>
            ) : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rename-client">{c.clientLabel}</Label>
            <Input
              id="rename-client"
              value={client}
              maxLength={80}
              onChange={(e) => setClient(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {c.cancel}
            </Button>
            <Button type="submit" loading={busy} loadingLabel={c.saving}>
              {c.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  project,
  onClose,
  remove,
  onDeleted,
}: {
  project: { id: string; name: string };
  onClose: () => void;
  remove: ProjectMenuActions["remove"];
  onDeleted: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim() === project.name;
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="grid gap-4">
        <DialogTitle className="text-panel font-semibold tracking-tight">
          {c.deleteTitle(project.name)}
        </DialogTitle>
        <DialogDescription className="text-body text-muted">{c.deleteBody}</DialogDescription>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!matches) return;
            setBusy(true);
            const res = await remove(project.id, typed);
            setBusy(false);
            if (!res.ok) {
              setError(res.code === "validation" ? c.deleteMismatch : c.saveFailed);
              return;
            }
            onDeleted();
            onClose();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="delete-confirm">{c.deleteConfirmLabel}</Label>
            <p className="font-mono text-small">{project.name}</p>
            <Input
              id="delete-confirm"
              value={typed}
              autoComplete="off"
              onChange={(e) => {
                setTyped(e.target.value);
                setError(null);
              }}
              aria-describedby="delete-help"
            />
            <p id="delete-help" className={cn("text-caption", error ? "text-bad" : "text-muted")}>
              {error ?? (typed && !matches ? c.deleteMismatch : "")}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              {c.cancel}
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={busy}
              loadingLabel={c.deleting}
              disabledReason={matches ? undefined : c.deleteMismatch}
            >
              {c.deleteConfirm}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
