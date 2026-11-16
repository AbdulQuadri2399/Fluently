import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { AccountMenu } from "./AccountMenu";
import { shellCopy as c } from "./copy";

const navLink = "rounded-sm px-2 py-1 text-small font-medium text-text-muted hover:text-text";

/** Global top bar (03 §1). The help menu arrives with onboarding (T1.2). */
export function TopBar({ email }: { email: string }) {
  return (
    <header className="flex h-14 items-center gap-6 border-b border-border bg-surface px-4">
      <Link href="/projects" className="text-section font-semibold tracking-tight">
        Fluently
      </Link>
      <nav aria-label={c.main} className="flex items-center gap-2">
        <Link className={navLink} href="/projects">
          {c.projects}
        </Link>
        <Link className={navLink} href="/toolkit">
          {c.toolkit}
        </Link>
        <Link className={navLink} href="/settings">
          {c.settings}
        </Link>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <AccountMenu email={email} signOut={signOut} />
      </div>
    </header>
  );
}
