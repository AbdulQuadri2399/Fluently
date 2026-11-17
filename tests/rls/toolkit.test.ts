import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createIsolatedAdmin, createIsolatedUser } from "../helpers/supabase";
import { saveToolkitVersion } from "@/lib/toolkit/service";

// toolkit_versions, principles, principle_relations (04 section 5, AC4.8): members read,
// admins insert, nobody updates or deletes.
describe("RLS toolkit", () => {
  let admin: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  let member: { client: SupabaseClient; id: string };
  let versionId: string;

  beforeAll(async () => {
    admin = await createIsolatedAdmin();
    member = await admin.addMember();
    const content = readFileSync("fixtures/toolkit/sample-toolkit.csv", "utf8");
    const res = await saveToolkitVersion(admin.client, { fileName: "sample-toolkit.csv", content });
    if (!res.ok) throw new Error(`save failed: ${res.code}`);
    versionId = res.data.versionId;
  });

  it("member reads versions, principles and relations", async () => {
    const v = await member.client.from("toolkit_versions").select("id").eq("id", versionId);
    expect(v.data).toHaveLength(1);
    const p = await member.client.from("principles").select("id").eq("version_id", versionId);
    expect(p.data).toHaveLength(30);
    const r = await member.client
      .from("principle_relations")
      .select("id")
      .eq("version_id", versionId);
    expect(r.data?.length).toBeGreaterThan(0);
  });

  it("member insert refused", async () => {
    const res = await saveToolkitVersion(member.client, { fileName: "x.csv", content: "" });
    expect(res).toEqual({ ok: false, code: "forbidden" });
    const direct = await member.client.from("toolkit_versions").insert({
      workspace_id: admin.workspaceId,
      number: 99,
      file_name: "x.csv",
      uploaded_by: member.id,
      principle_count: 0,
    });
    expect(direct.error).not.toBeNull();
    const rpc = await member.client.rpc("save_toolkit_version", {
      p_file_name: "x.csv",
      p_principles: [],
      p_relations: [],
      p_warnings: [],
    });
    expect(rpc.error?.code).toBe("42501");
  });

  it("admin update/delete refused (saved versions are read-only)", async () => {
    for (const table of ["toolkit_versions", "principles", "principle_relations"] as const) {
      const col = table === "toolkit_versions" ? "id" : "version_id";
      const upd = await admin.client
        .from(table)
        .update({ updated_at: new Date().toISOString() })
        .eq(col, versionId)
        .select("id");
      expect(upd.data ?? []).toHaveLength(0);
      const del = await admin.client.from(table).delete().eq(col, versionId).select("id");
      expect(del.data ?? []).toHaveLength(0);
    }
    const still = await admin.client.from("principles").select("id").eq("version_id", versionId);
    expect(still.data).toHaveLength(30);
  });

  it("another workspace sees nothing", async () => {
    const other = await createIsolatedUser();
    const v = await other.client.from("toolkit_versions").select("id").eq("id", versionId);
    expect(v.data ?? []).toHaveLength(0);
    const p = await other.client.from("principles").select("id").eq("version_id", versionId);
    expect(p.data ?? []).toHaveLength(0);
  });
});
