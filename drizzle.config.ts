import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./supabase/migrations",
  schemaFilter: ["public"],
  entities: { roles: { provider: "supabase" } },
  migrations: { prefix: "supabase" },
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
