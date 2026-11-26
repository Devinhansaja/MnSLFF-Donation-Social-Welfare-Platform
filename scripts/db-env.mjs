// Runs a command with DATABASE_URL / DIRECT_URL filled in from whichever
// variable names the hosting provider uses (Neon, Supabase, Vercel Postgres).
// Usage: node scripts/db-env.mjs prisma migrate deploy
import { spawnSync } from "node:child_process";

// Local development: read .env (never overrides variables already set, e.g. on Vercel).
try {
  process.loadEnvFile(".env");
} catch {}

const env = { ...process.env };
env.DATABASE_URL ||= env.POSTGRES_PRISMA_URL || env.POSTGRES_URL || env.DATABASE_URL_UNPOOLED || "";
env.DIRECT_URL ||= env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL;

if (!env.DATABASE_URL) {
  console.error("\n✖ No database configured. Set DATABASE_URL (PostgreSQL) in your environment variables.\n");
  process.exit(1);
}

const [cmd, ...args] = process.argv.slice(2);
const r = spawnSync(cmd === "prisma" ? "npx" : cmd, cmd === "prisma" ? ["prisma", ...args] : args, { stdio: "inherit", env, shell: true });
process.exit(r.status ?? 1);
