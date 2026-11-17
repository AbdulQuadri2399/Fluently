import { beforeAll, describe, expect, it } from "vitest";
import { anonClient, createIsolatedAdmin, PASSWORD, uniqueEmail } from "../helpers/supabase";
import { addAllowEntry, listAllowlist, removeAllowEntry } from "@/lib/settings/service";

// O5 addAllowEntry / removeAllowEntry (AC3.1–AC3.3).
describe("O5 allowlist", () => {
  let admin: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  beforeAll(async () => {
    admin = await createIsolatedAdmin();
  });

  it("add email", async () => {
    const email = uniqueEmail("invited.test");
    const res = await addAllowEntry(admin.client, { value: `  ${email.toUpperCase()} ` });
    expect(res).toMatchObject({ ok: true, data: { value: email, kind: "email" } });
    const signUp = await anonClient().auth.signUp({ email, password: PASSWORD });
    expect(signUp.error).toBeNull();
  });

  it("add domain", async () => {
    const domain = `@d${Date.now()}.test`;
    const res = await addAllowEntry(admin.client, { value: domain });
    expect(res).toMatchObject({ ok: true, data: { value: domain, kind: "domain" } });
    const list = await listAllowlist(admin.client);
    expect(list.ok && list.data.some((e) => e.value === domain)).toBe(true);
  });

  it("invalid entry → validation", async () => {
    for (const value of ["not an email", "@nodot", "company.com", ""]) {
      expect(await addAllowEntry(admin.client, { value })).toEqual({
        ok: false,
        code: "validation",
      });
    }
  });

  it("members can't add entries → forbidden", async () => {
    const m = await admin.addMember();
    expect(await addAllowEntry(m.client, { value: "x@y.test" })).toEqual({
      ok: false,
      code: "forbidden",
    });
  });

  it("removed entry blocks new sign-up, keeps existing account", async () => {
    const domain = `r${Date.now()}.test`;
    const added = await addAllowEntry(admin.client, { value: `@${domain}` });
    if (!added.ok) throw new Error("add failed");
    const first = uniqueEmail(domain);
    expect((await anonClient().auth.signUp({ email: first, password: PASSWORD })).error).toBeNull();

    expect(await removeAllowEntry(admin.client, added.data.id)).toEqual({
      ok: true,
      data: undefined,
    });
    const blocked = await anonClient().auth.signUp({
      email: uniqueEmail(domain),
      password: PASSWORD,
    });
    expect(blocked.error).not.toBeNull();

    // The existing account still exists and is active.
    const members = await admin.client.from("members").select("email, active").eq("email", first);
    expect(members.data).toEqual([{ email: first, active: true }]);
  });
});
