import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import type { TestProject } from "vitest/node";

// Each run gets a brand-new SQLite file in the OS temp folder, so tests never
// touch prisma/dev.db and nothing needs to be reset or deleted.
export default function setup(project: TestProject) {
  const file = path.join(os.tmpdir(), `mnslff-test-${Date.now()}-${process.pid}.db`).replace(/\\/g, "/");
  const url = `file:${file}`;
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
    stdio: "ignore",
  });
  project.provide("testDbUrl", url);
}

declare module "vitest" {
  export interface ProvidedContext {
    testDbUrl: string;
  }
}
