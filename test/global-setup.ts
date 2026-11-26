import { execSync } from "node:child_process";
import type { TestProject } from "vitest/node";

// Database tests need an EMPTY, disposable PostgreSQL database in TEST_DATABASE_URL
// (never your real one — tests delete rows). Without it, DB tests are skipped and
// the pure finance/permission tests still run.
export default function setup(project: TestProject) {
  const url = process.env.TEST_DATABASE_URL ?? "";
  if (url) {
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
      stdio: "ignore",
    });
  }
  project.provide("testDbUrl", url);
}

declare module "vitest" {
  export interface ProvidedContext {
    testDbUrl: string;
  }
}
