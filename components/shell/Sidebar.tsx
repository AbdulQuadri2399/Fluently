"use client";

import {
  BooksIcon,
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  FolderSimpleIcon,
  GearSixIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  QuestionIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./AccountMenu";
import { shellCopy as c } from "./copy";

export type SidebarProject = { id: string; name: string; status: string };

function NavLink({
  href,
  icon,
  label,
  collapsed,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const current = pathname === href || (href !== "/home" && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-sm px-2 text-small font-medium text-muted hover:bg-soft hover:text-ink",
        "aria-[current=page]:bg-canvas aria-[current=page]:text-ink [&_svg]:size-4",
      )}
    >
      {icon}
      <span className={cn(collapsed && "sr-only")}>{label}</span>
    </Link>
  );
}

/** Global sidebar (03b SCR3; the user's notes T1 to T3). */
export function Sidebar({
  email,
  projects,
  signOut,
  onHelp,
}: {
  email: string;
  projects: SidebarProject[];
  signOut: () => Promise<void>;
  onHelp: () => void;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCollapsed(false);
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-dvh flex-col gap-3.5 border-r border-line bg-paper px-3 py-4 transition-[width] duration-base ease-standard",
        collapsed ? "w-[60px]" : "w-[232px]",
      )}
    >
      <Link
        href="/home"
        className="flex items-center gap-2 px-2 text-small font-semibold tracking-tight"
      >
        <span
          aria-hidden="true"
          className="grid size-5 place-items-center rounded-[5px] bg-action text-[12px] text-on-action"
        >
          F
        </span>
        <span className={cn(collapsed && "sr-only")}>Fluently</span>
      </Link>

      <form
        role="search"
        className={cn(
          "flex h-8 items-center gap-2 rounded-sm bg-canvas px-2 text-muted",
          collapsed && "hidden",
        )}
        onSubmit={(e) => {
          e.preventDefault();
          router.push(
            query.trim() ? `/projects?search=${encodeURIComponent(query.trim())}` : "/projects",
          );
        }}
      >
        <MagnifyingGlassIcon aria-hidden="true" className="size-4 shrink-0" />
        <label htmlFor="sidebar-search" className="sr-only">
          {c.search}
        </label>
        <input
          ref={searchRef}
          id="sidebar-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={c.search}
          className="min-w-0 flex-1 bg-transparent text-small text-ink placeholder:text-muted focus:outline-none"
        />
        <kbd className="rounded-xs border border-line-strong bg-surface px-1.5 font-mono text-[11px] text-muted">
          ⌘K
        </kbd>
      </form>

      <nav aria-label={c.main} className="grid gap-3.5">
        <div className="grid gap-0.5">
          <NavLink href="/home" icon={<HouseIcon />} label={c.home} collapsed={collapsed} />
          <NavLink
            href="/projects"
            icon={<FolderSimpleIcon />}
            label={c.projects}
            collapsed={collapsed}
          />
        </div>
        <div className="mx-2 h-px bg-line" />
        <div className="grid gap-0.5">
          <NavLink href="/toolkit" icon={<BooksIcon />} label={c.toolkit} collapsed={collapsed} />
          <NavLink
            href="/settings"
            icon={<GearSixIcon />}
            label={c.settings}
            collapsed={collapsed}
          />
        </div>
        <div className="mx-2 h-px bg-line" />
      </nav>

      {!collapsed && projects.length > 0 ? (
        <div className="grid min-h-0 gap-1 overflow-y-auto">
          <p className="px-2 text-caption font-medium text-muted">{c.projects}</p>
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-small hover:bg-soft"
            >
              <span className="truncate">{p.name}</span>
              {p.status === "waiting" || p.status === "running" ? (
                <span className="shrink-0 text-caption text-muted">
                  {p.status === "waiting" ? c.waitingShort : c.runningShort}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-auto grid gap-2">
        <button
          type="button"
          onClick={onHelp}
          title={collapsed ? c.help : undefined}
          className="flex h-8 items-center gap-2.5 rounded-sm px-2 text-small text-muted hover:bg-soft hover:text-ink [&_svg]:size-4"
        >
          <QuestionIcon aria-hidden="true" />
          <span className={cn(collapsed && "sr-only")}>{c.help}</span>
        </button>
        <div className="mx-2 h-px bg-line" />
        <AccountMenu email={email} signOut={signOut} collapsed={collapsed} />
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? c.expand : c.collapse}
          className="flex h-8 items-center gap-2.5 rounded-sm px-2 text-small text-muted hover:bg-soft hover:text-ink [&_svg]:size-4"
        >
          {collapsed ? (
            <CaretDoubleRightIcon aria-hidden="true" />
          ) : (
            <CaretDoubleLeftIcon aria-hidden="true" />
          )}
          <span className={cn(collapsed && "sr-only")}>{c.collapse}</span>
        </button>
      </div>
    </aside>
  );
}
