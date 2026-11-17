// Applies any migrations in supabase/migrations that the hosted database hasn't run yet,
// through the Supabase Management API, and records them in supabase_migrations.schema_migrations
// (04 D25). Usage: node scripts/apply-cloud-migrations.mjs <project-ref>
// The access token is added by this workspace's network proxy; nothing secret lives here.
import { readdirSync, readFileSync } from "node:fs";

const ref = process.argv[2];
if (!ref) throw new Error("Usage: node scripts/apply-cloud-migrations.mjs <project-ref>");
const token = process.env.SUPABASE_ACCESS_TOKEN ?? "proxy-injected";

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${body}`);
  return JSON.parse(body);
}

const applied = new Set(
  (await query("select version from supabase_migrations.schema_migrations")).map((r) => r.version),
);
const files = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort();
for (const file of files) {
  const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
  if (applied.has(version)) continue;
  const name = rest.join("_");
  const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
  const record = `insert into supabase_migrations.schema_migrations (version, name, statements)
    values ('${version}', '${name}', array[$fl$${sql}$fl$]);`;
  await query(`begin;\n${sql}\n;\n${record}\ncommit;`);
  console.log(`applied ${file}`);
}
console.log("up to date");
