import "server-only";
import { headers } from "next/headers";

// Simple fixed-window, in-memory limiter (per server instance).
// For multi-instance production, replace with Redis/Upstash.
const buckets = new Map<string, { count: number; reset: number }>();

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function rateLimit(name: string, limit: number, windowMs = 10 * 60 * 1000) {
  const key = `${name}:${await clientIp()}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count++;
  return b.count <= limit;
}
