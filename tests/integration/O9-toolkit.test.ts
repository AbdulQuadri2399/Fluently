import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { createIsolatedAdmin } from "../helpers/supabase";
import { createProject } from "@/lib/projects/service";
import { listToolkitVersions, saveToolkitVersion } from "@/lib/toolkit/service";

const sample = readFileSync("fixtures/toolkit/sample-toolkit.csv", "utf8");

// O9 saveToolkitVersion (AC4.1, AC4.5, AC7.4).
describe("O9 toolkit", () => {
  let admin: Awaited<ReturnType<typeof createIsolatedAdmin>>;
  beforeAll(async () => {
    admin = await createIsolatedAdmin();
  });

  it("valid save creates version n+1 as default; existing project keeps old pin (AC7.4)", async () => {
    const v1 = await saveToolkitVersion(admin.client, {
      fileName: "sample-toolkit.csv",
      content: sample,
    });
    if (!v1.ok) throw new Error(v1.code);
    expect(v1.data.number).toBe(1);

    const project = await createProject(admin.client, {
      name: "Pinned to v1",
      mode: "new",
      channel: "screens",
    });
    if (!project.ok) throw new Error(project.code);

    const v2 = await saveToolkitVersion(admin.client, {
      fileName: "sample-toolkit.json",
      content: readFileSync("fixtures/toolkit/sample-toolkit.json", "utf8"),
    });
    if (!v2.ok) throw new Error(v2.code);
    expect(v2.data.number).toBe(2);

    const ws = await admin.client
      .from("workspaces")
      .select("default_toolkit_version_id")
      .eq("id", admin.workspaceId)
      .single();
    expect(ws.data?.default_toolkit_version_id).toBe(v2.data.versionId);
    const pinned = await admin.client
      .from("projects")
      .select("toolkit_version_id")
      .eq("id", project.data.id)
      .single();
    expect(pinned.data?.toolkit_version_id).toBe(v1.data.versionId);

    const list = await listToolkitVersions(admin.client);
    if (!list.ok) throw new Error(list.code);
    expect(list.data.map((v) => [v.number, v.isDefault])).toEqual([
      [2, true],
      [1, false],
    ]);
    expect(list.data[0]?.principleCount).toBe(30);
    const e = list.data[0]!.evidence;
    expect(e.strong + e.some + e.none).toBe(30);
  });

  it("invalid file → validation, nothing saved", async () => {
    const before = await listToolkitVersions(admin.client);
    const res = await saveToolkitVersion(admin.client, {
      fileName: "bad-duplicate-id.csv",
      content: readFileSync("fixtures/toolkit/bad-duplicate-id.csv", "utf8"),
    });
    expect(res).toEqual({ ok: false, code: "validation" });
    const after = await listToolkitVersions(admin.client);
    expect(after.ok && before.ok && after.data.length === before.data.length).toBe(true);
  });

  it("file > 10 MB → validation", async () => {
    const big = sample + "x".repeat(10 * 1024 * 1024);
    expect(await saveToolkitVersion(admin.client, { fileName: "big.csv", content: big })).toEqual({
      ok: false,
      code: "validation",
    });
  });

  it("real layout loads, skipped rows listed, new version keeps IDs by name (AC33.5)", async () => {
    // A workspace of its own, so earlier toolkit versions do not change the numbering.
    const owner = await createIsolatedAdmin();
    const sheet = readFileSync("fixtures/toolkit/sheet-layout.csv", "utf8");
    const v1 = await saveToolkitVersion(owner.client, {
      fileName: "sheet-layout.csv",
      content: sheet,
    });
    if (!v1.ok) throw new Error(v1.code);
    const keys = async (versionId: string) =>
      Object.fromEntries(
        (
          (
            await owner.client
              .from("principles")
              .select("principle_key, name")
              .eq("version_id", versionId)
          ).data ?? []
        ).map((p) => [p.name.toLowerCase(), p.principle_key]),
      );
    const first = await keys(v1.data.versionId);
    expect(Object.keys(first)).toHaveLength(6);
    expect(first["short lines"]).toBe("P001");
    expect(first["second look"]).toBe("P006");
    // The notices are saved with the version, for the owners to tidy the sheet.
    const saved = await owner.client
      .from("toolkit_versions")
      .select("warnings")
      .eq("id", v1.data.versionId)
      .single();
    const kinds = ((saved.data!.warnings ?? []) as { kind: string }[]).map((w) => w.kind);
    expect(kinds).toEqual(
      expect.arrayContaining(["generatedIds", "mergedSameName", "thinRows", "noName"]),
    );

    // Same principles in a different order, plus a new one: existing IDs hold.
    const lines = sheet.trim().split(/\r?\n/);
    const reordered = [
      lines[0],
      ...lines.slice(1).reverse(),
      lines[1]!.replace("Short Lines", "Brand New"),
    ].join("\n");
    const v2 = await saveToolkitVersion(owner.client, {
      fileName: "sheet-layout-v2.csv",
      content: reordered,
    });
    if (!v2.ok) throw new Error(v2.code);
    const second = await keys(v2.data.versionId);
    for (const name of [
      "Short Lines",
      "Calm Colours",
      "Price Anchor",
      "Pause Prompt",
      "Second Look",
    ])
      expect(second[name.toLowerCase()], name).toBe(first[name.toLowerCase()]);
    expect(second["brand new"]).toBe("P007");
  });
});
