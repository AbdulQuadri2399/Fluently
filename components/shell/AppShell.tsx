"use client";

import { useState, type ReactNode } from "react";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import type { ActionResult } from "@/lib/actions/result";
import type { CreateProjectInput } from "@/lib/schemas/project";
import { shellCopy as c } from "./copy";
import { Sidebar, type SidebarProject } from "./Sidebar";

/**
 * Signed-in layout: sidebar + page, the desktop-only notice below 1024 px (AC22.6, D23),
 * and the first-run introduction (AC2.1 to AC2.3).
 */
export function AppShell({
  email,
  projects,
  signOut,
  showOnboarding,
  completeOnboarding,
  createProject,
  children,
}: {
  email: string;
  projects: SidebarProject[];
  signOut: () => Promise<void>;
  showOnboarding: boolean;
  completeOnboarding: (how: "finished" | "skipped") => Promise<unknown>;
  createProject: (input: CreateProjectInput) => Promise<ActionResult<{ id: string }>>;
  children: ReactNode;
}) {
  const [onboardingOpen, setOnboardingOpen] = useState(showOnboarding);
  const [newOpen, setNewOpen] = useState(false);
  return (
    <>
      <div
        role="status"
        className="hidden min-h-dvh items-center justify-center p-8 text-center max-[1023px]:flex"
      >
        <p className="max-w-sm text-lead">{c.desktopOnly}</p>
      </div>
      <div className="flex min-h-dvh max-[1023px]:hidden">
        <Sidebar
          email={email}
          projects={projects}
          signOut={signOut}
          onHelp={() => setOnboardingOpen(true)}
        />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
      <Onboarding
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onDone={(how) => {
          void completeOnboarding(how);
          if (how === "finished") setNewOpen(true);
        }}
      />
      <NewProjectDialog
        action={createProject}
        open={newOpen}
        onOpenChange={setNewOpen}
        showTrigger={false}
      />
    </>
  );
}
