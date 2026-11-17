import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, createIsolatedAdmin, PASSWORD, sql } from "../helpers/supabase";
import { setMemberActive, setMemberRole } from "@/lib/settings/service";

const db = sql();
afterAll(() => db.end());

// O6 setMemberRole / setMemberActive (AC3.4, AC3.5).
describe("O6 members", () => {
  let admin: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  beforeAll(async () => {
    admin = await createIsolatedAdmin();
  });

  it("last admin cannot be demoted → conflict", async () => {
    expect(await setMemberRole(admin.client, admin.id, "member")).toEqual({
      ok: false,
      code: "conflict",
    });
    expect(await setMemberActive(admin.client, admin.id, false)).toEqual({
      ok: false,
      code: "conflict",
    });
  });

  it("members can't change roles → forbidden", async () => {
    const m = await admin.addMember();
    expect(await setMemberRole(m.client, m.id, "admin")).toEqual({ ok: false, code: "forbidden" });
  });

  it("with a second admin, the first can step down", async () => {
    const m = await admin.addMember();
    expect((await setMemberRole(admin.client, m.id, "admin")).ok).toBe(true);
    expect((await setMemberRole(m.client, admin.id, "member")).ok).toBe(true);
    expect((await setMemberRole(m.client, admin.id, "admin")).ok).toBe(true);
  });

  it("deactivated member cannot read projects, can't sign in, and work stays", async () => {
    const m = await admin.addMember();
    const { data: p } = await m.client
      .from("projects")
      .insert({
        workspace_id: admin.workspaceId,
        name: "Kept work",
        mode: "new",
        channel: "email",
        created_by: m.id,
        updated_by: m.id,
      })
      .select("id")
      .single();
    expect(p?.id).toBeTruthy();

    expect(await setMemberActive(admin.client, m.id, false)).toEqual({ ok: true, data: undefined });
    const read = await m.client.from("projects").select("id");
    expect(read.data ?? []).toHaveLength(0);

    const [row] = await db<
      { email: string }[]
    >`select email from public.members where id = ${m.id}`;
    const email = row!.email;
    const signIn = await anonClient().auth.signInWithPassword({ email, password: PASSWORD });
    expect(signIn.error).not.toBeNull();

    const kept = await admin.client.from("projects").select("name").eq("id", p!.id).single();
    expect(kept.data?.name).toBe("Kept work");

    expect(await setMemberActive(admin.client, m.id, true)).toEqual({ ok: true, data: undefined });
    expect(
      (await anonClient().auth.signInWithPassword({ email, password: PASSWORD })).error,
    ).toBeNull();
  });
});
