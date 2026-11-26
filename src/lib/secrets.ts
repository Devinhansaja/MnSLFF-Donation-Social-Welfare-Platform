import crypto from "node:crypto";

/**
 * Returns the named secret from the environment, or — if it isn't set — a key
 * derived from the database connection string (which is itself secret and only
 * known to the server). Setting AUTH_SECRET / SANDBOX_WEBHOOK_SECRET explicitly
 * is still recommended; note that changing the database URL changes derived keys
 * (signing everyone out).
 */
export function appSecret(name: "AUTH_SECRET" | "SANDBOX_WEBHOOK_SECRET"): string | undefined {
  const explicit = process.env[name];
  if (explicit && explicit.length >= 32) return explicit;
  const base = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
  if (!base) return explicit || undefined;
  return crypto.createHmac("sha256", base).update(`mnslff:${name}`).digest("hex");
}
