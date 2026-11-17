"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { onboardingCopy as c } from "./copy";
import { CheckpointDiagram, TraceDiagram, TreeDiagram } from "./Diagrams";

const diagrams = [TreeDiagram, CheckpointDiagram, TraceDiagram];

/**
 * SCR2 Onboarding (AC2.1 to AC2.3): three steps over the home page. Skip, close and
 * "Start my first project" all record completion; the help button reopens it.
 */
export function Onboarding({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (how: "finished" | "skipped") => void;
}) {
  const [step, setStep] = useState(0);
  const forward = useRef<HTMLButtonElement>(null);
  const s = c.steps[step] ?? c.steps[0];
  const Diagram = diagrams[step] ?? TreeDiagram;
  const last = step === c.steps.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onDone("skipped");
          setStep(0);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent
        className="max-w-[640px] p-8"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          forward.current?.focus();
        }}
      >
        <p className="mb-5 font-mono text-[11px] uppercase tracking-wide text-muted">
          {c.stepOf(step + 1)}
        </p>
        <div className="mb-6 rounded-lg bg-canvas p-5">
          <Diagram />
        </div>
        <DialogTitle className="mb-2 text-panel font-semibold tracking-tight">
          {s.title}
        </DialogTitle>
        <DialogDescription className="text-body text-muted">{s.body}</DialogDescription>
        <div className="mt-8 flex items-center gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {c.steps.map((_, i) => (
              <span
                key={i}
                className={cn("size-1.5 rounded-full bg-line-strong", i === step && "bg-ink")}
              />
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                {c.back}
              </Button>
            ) : null}
            {!last ? (
              <Button
                variant="ghost"
                onClick={() => {
                  onDone("skipped");
                  onOpenChange(false);
                  setStep(0);
                }}
              >
                {c.skip}
              </Button>
            ) : null}
            {last ? (
              <Button
                ref={forward}
                onClick={() => {
                  onDone("finished");
                  onOpenChange(false);
                  setStep(0);
                }}
              >
                {c.start}
              </Button>
            ) : (
              <Button ref={forward} variant="secondary" onClick={() => setStep(step + 1)}>
                {c.next}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
