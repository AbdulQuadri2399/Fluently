import { describe, expect, it } from "vitest";
import { adminClient, PASSWORD, sql, uniqueEmail } from "../helpers/supabase";

describe("O1 sign-up allowlist at the database (AC1.1, AC1.2, AC1.7, D13)", () => {
  it("allowlisted email creates member", async () => {
    const email = uniqueEmail("fluently.test");
    const { data, error } = await adminClient().auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    expect(error).toBeNull();
    const userId = data.user?.id ?? "";
    const db = sql();
    try {
      const rows = await db<{ role: string; name: string }[]>`
        select m.role, w.name from public.members m join public.workspaces w on w.id = m.workspace_id
        where m.id = ${userId}`;
      expect(rows).toEqual([{ role: "member", name: "Fluently Dev" }]);
    } finally {
      await db.end();
    }
  });

  it("non-allowlisted email is refused at the database", async () => {
    const email = uniqueEmail("not-invited.example");
    const { data, error } = await adminClient().auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });

  it("bootstrap email creates workspace and admin", async () => {
    const db = sql();
    try {
      await db
        .begin(async (tx) => {
          await tx`delete from public.projects`;
          await tx`delete from public.events`;
          await tx`delete from public.ai_usage`;
          await tx`delete from public.allowlist_entries`;
          await tx`delete from public.members`;
          await tx`delete from public.workspaces`;
          await tx`update private.app_config set bootstrap_admin_email = 'boss@bootstrap.test'`;
          await tx`insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
                   values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(),
                           'authenticated', 'authenticated', 'boss@bootstrap.test', now(), now())`;
          const rows = await tx<{ role: string; n: number }[]>`
            select m.role, (select count(*)::int from public.workspaces) as n
            from public.members m where m.email = 'boss@bootstrap.test'`;
          expect(rows).toEqual([{ role: "admin", n: 1 }]);
          throw new Error("rollback");
        })
        .catch((e: Error) => {
          if (e.message !== "rollback") throw e;
        });
    } finally {
      await db.end();
    }
  });
});
