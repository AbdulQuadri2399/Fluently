import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { currentMember } from "@/lib/projects/service";
import type { Database, Json } from "@/lib/supabase/database.types";
import { keepKeysByName } from "./keys";
import { MAX_BYTES, parseToolkit, type EvidenceLevel } from "./parse";

type Client = SupabaseClient<Database>;

export type ToolkitVersionRow = {
  id: string;
  number: number;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  principleCount: number;
  evidence: Record<EvidenceLevel, number>;
  isDefault: boolean;
};

export type SaveToolkitInput = { fileName: string; content: string };

/**
 * O9 saveToolkitVersion (AC4.5): re-checks the file on the server (never trusts the browser's
 * preview), then saves version n+1 with its principles and connections in one transaction
 * and makes it the default for new projects. Existing projects keep their pin (AC7.4).
 */
export async function saveToolkitVersion(
  client: Client,
  input: SaveToolkitInput,
): Promise<ActionResult<{ versionId: string; number: number }>> {
  if (typeof input.content !== "string" || typeof input.fileName !== "string")
    return fail("validation");
  const size = new TextEncoder().encode(input.content).length;
  if (size > MAX_BYTES) return fail("validation");
  const me = await currentMember(client);
  if (!me || me.role !== "admin") return fail("forbidden");
  const parsed = parseToolkit(input.content, input.fileName, size);
  if (!parsed.ok) return fail("validation");
  let { principles, relations } = parsed;
  if (parsed.warnings.some((w) => w.kind === "generatedIds")) {
    // No ID column: a principle with the same name as in the latest version keeps its ID (AC33.5).
    const { data: latest } = await client
      .from("toolkit_versions")
      .select("id")
      .order("number", { ascending: false })
      .limit(1);
    const { data: previous } = latest?.[0]
      ? await client
          .from("principles")
          .select("principle_key, name")
          .eq("version_id", latest[0].id)
          .limit(20000)
      : { data: [] };
    ({ principles, relations } = keepKeysByName(principles, relations, previous ?? []));
  }
  const { data, error } = await client.rpc("save_toolkit_version", {
    p_file_name: input.fileName.slice(0, 255),
    p_principles: principles as unknown as Json,
    p_relations: relations as unknown as Json,
    p_warnings: parsed.warnings as unknown as Json,
  });
  if (error) return fail(error.code === "42501" ? "forbidden" : "unavailable");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return fail("unavailable");
  return ok({ versionId: row.version_id, number: row.version_number });
}

/** Versions newest first, with uploader and evidence-level counts (SCR11 default state). */
export async function listToolkitVersions(
  client: Client,
): Promise<ActionResult<ToolkitVersionRow[]>> {
  const me = await currentMember(client);
  if (!me) return fail("forbidden");
  const [versions, ws, levels] = await Promise.all([
    client
      .from("toolkit_versions")
      .select(
        "id, number, file_name, created_at, principle_count, uploader:members!toolkit_versions_uploaded_by_members_id_fk(display_name, email)",
      )
      .order("number", { ascending: false }),
    client
      .from("workspaces")
      .select("default_toolkit_version_id")
      .eq("id", me.workspace_id)
      .single(),
    client.from("principles").select("version_id, evidence_level").limit(20000),
  ]);
  if (versions.error || levels.error) return fail("unavailable");
  const counts = new Map<string, Record<EvidenceLevel, number>>();
  for (const p of levels.data ?? []) {
    const c = counts.get(p.version_id) ?? { strong: 0, some: 0, none: 0 };
    c[p.evidence_level as EvidenceLevel] += 1;
    counts.set(p.version_id, c);
  }
  return ok(
    (versions.data ?? []).map((v) => {
      const u = Array.isArray(v.uploader) ? v.uploader[0] : v.uploader;
      return {
        id: v.id,
        number: v.number,
        fileName: v.file_name,
        uploadedAt: v.created_at,
        uploadedBy: u?.display_name || u?.email || "",
        principleCount: v.principle_count,
        evidence: counts.get(v.id) ?? { strong: 0, some: 0, none: 0 },
        isDefault: v.id === ws.data?.default_toolkit_version_id,
      };
    }),
  );
}

/** Next version number, for "Save as version n" in the preview. */
export async function nextVersionNumber(client: Client): Promise<number> {
  const { data } = await client
    .from("toolkit_versions")
    .select("number")
    .order("number", { ascending: false })
    .limit(1);
  return (data?.[0]?.number ?? 0) + 1;
}
