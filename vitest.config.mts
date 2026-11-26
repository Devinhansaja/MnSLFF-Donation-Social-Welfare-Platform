import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    globalSetup: ["./test/global-setup.ts"],
    env: {
      SANDBOX_WEBHOOK_SECRET: "test-sandbox-secret",
      AUTH_SECRET: "test-auth-secret-test-auth-secret-0123456789",
    },
    fileParallelism: false,
  },
});
