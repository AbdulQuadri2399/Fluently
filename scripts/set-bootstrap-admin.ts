// Copies BOOTSTRAP_ADMIN_EMAIL into private.app_config (AC1.7). Run once per environment:
//   pnpm tsx scripts/set-bootstrap-admin.ts
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
const url = process.env.DATABASE_URL;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
if (!url || !email) {
  console.error("DATABASE_URL and BOOTSTRAP_ADMIN_EMAIL must be set");
  process.exit(1);
}
const sql = postgres(url, { max: 1 });
await sql`update private.app_config set bootstrap_admin_email = ${email.trim().toLowerCase()}`;
await sql.end();
console.log("Bootstrap admin email set.");
