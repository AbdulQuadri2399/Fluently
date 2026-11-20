"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/actions/result";
import { createProjectSchema, type CreateProjectInput } from "@/lib/schemas/project";
import { cn } from "@/lib/utils";
import { RadioGroup as R } from "radix-ui";
import { projectsCopy as c } from "./copy";

type Action = (input: CreateProjectInput) => Promise<ActionResult<{ id: string }>>;

function ChoiceCard({
  value,
  title,
  hint,
  disabled,
}: {
  value: string;
  title: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <R.Item
      value={value}
      disabled={disabled}
      aria-label={hint ? `${title}. ${hint}` : title}
      className={cn(
        "grid gap-0.5 rounded-md border border-line bg-surface px-3.5 py-3 text-left",
        "data-[state=checked]:border-ink data-[state=checked]:shadow-[0_0_0_3px_var(--line)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        "disabled:cursor-not-allowed disabled:bg-soft disabled:opacity-60",
      )}
    >
      <span className="text-small font-medium">{title}</span>
      {hint ? <span className="text-caption text-muted">{hint}</span> : null}
    </R.Item>
  );
}

/** SCR4 New project (AC7.1, AC7.2). */
export function NewProjectDialog({
  action,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: {
  action: Action;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) {
  const router = useRouter();
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = (o: boolean) => {
    setOwnOpen(o);
    onOpenChange?.(o);
  };
  const [status, setStatus] = useState<"default" | "saving" | "error">("default");
  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", mode: "new", channel: "email", clientLabel: "" },
  });
  const nameError = form.formState.errors.name?.message;

  async function submit(values: CreateProjectInput) {
    setStatus("saving");
    try {
      const res = await action(values);
      if (res.ok) {
        setOpen(false);
        router.push(`/projects/${res.data.id}/brief`);
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          form.reset();
          setStatus("default");
        }
      }}
    >
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button>
            <Plus weight="bold" aria-hidden="true" />
            {c.newProject}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent aria-describedby={undefined}>
        <DialogTitle className="mb-5 text-lead font-semibold">{c.newProject}</DialogTitle>
        {status === "error" ? (
          <p role="alert" className="mb-4 rounded-sm bg-bad-bg px-3 py-2 text-small text-bad">
            {c.saveFailed}
          </p>
        ) : null}
        <form noValidate onSubmit={form.handleSubmit(submit)} className="grid gap-5">
          <div className="grid gap-1.5">
            <Label htmlFor="np-name">{c.name}</Label>
            <Input
              id="np-name"
              autoFocus
              maxLength={80}
              disabled={status === "saving"}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "np-name-error" : undefined}
              {...form.register("name")}
            />
            {nameError ? (
              <p id="np-name-error" className="text-caption text-bad">
                {nameError}
              </p>
            ) : null}
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-small font-medium">{c.mode}</legend>
            <Controller
              control={form.control}
              name="mode"
              render={({ field }) => (
                <R.Root className="grid gap-2" value={field.value} onValueChange={field.onChange}>
                  <ChoiceCard value="new" title={c.modeNew} hint={c.modeNewHint} />
                  <ChoiceCard value="optimise" title={c.modeOptimise} hint={c.modeOptimiseHint} />
                </R.Root>
              )}
            />
          </fieldset>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-small font-medium">{c.channel}</legend>
            <Controller
              control={form.control}
              name="channel"
              render={({ field }) => (
                <R.Root
                  className="grid grid-cols-2 gap-2"
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <ChoiceCard
                    value="screens"
                    title={c.channelScreens}
                    hint={c.comingSoon}
                    disabled
                  />
                  <ChoiceCard value="email" title={c.channelEmail} />
                </R.Root>
              )}
            />
          </fieldset>
          <div className="grid gap-1.5">
            <Label htmlFor="np-client">{c.client}</Label>
            <Input
              id="np-client"
              maxLength={80}
              disabled={status === "saving"}
              {...form.register("clientLabel")}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {c.cancel}
            </Button>
            <Button type="submit" loading={status === "saving"} loadingLabel={c.creating}>
              {c.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
