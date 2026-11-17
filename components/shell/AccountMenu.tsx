"use client";

import { SignOutIcon } from "@phosphor-icons/react/dist/ssr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { shellCopy as c } from "./copy";

function initials(email: string) {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? local[1] ?? "")).toUpperCase();
}

export function AccountMenu({
  email,
  signOut,
  collapsed = false,
}: {
  email: string;
  signOut: () => Promise<void>;
  collapsed?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={c.account}
        className="flex h-9 min-w-0 items-center gap-2.5 rounded-sm px-2 text-left text-small text-muted hover:bg-soft hover:text-ink"
      >
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-canvas text-[11px] font-medium text-ink"
        >
          {initials(email)}
        </span>
        <span className={cn("truncate", collapsed && "sr-only")}>{email}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top">
        <DropdownMenuLabel>{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <SignOutIcon aria-hidden="true" className="size-4" />
          {c.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
