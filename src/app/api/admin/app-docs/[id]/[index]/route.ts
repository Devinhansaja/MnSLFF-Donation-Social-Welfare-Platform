import fs from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";

const TYPES: Record<string, string> = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

/** Private assistance-application documents, for reviewing staff only. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const s = await getSession();
  if (!s || !can(s.role, "application.review")) return new Response("Forbidden", { status: 403 });
  const { id, index } = await params;
  const app = await db.application.findUnique({ where: { id } });
  if (!app) return new Response("Not found", { status: 404 });
  let docs: unknown;
  try { docs = JSON.parse(app.documents || "[]"); } catch { docs = []; }
  const entry = Array.isArray(docs) ? docs[Number(index)] : undefined;
  const rel = typeof entry === "string" ? entry : entry && typeof entry === "object" && "path" in entry ? String((entry as { path: unknown }).path) : null;
  if (!rel) return new Response("Not found", { status: 404 });
  const root = path.resolve(process.cwd(), "storage");
  const full = path.resolve(root, rel.replace(/^storage[\\/]/, ""));
  if (!full.startsWith(root)) return new Response("Forbidden", { status: 403 });
  try {
    const buf = await fs.readFile(full);
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": TYPES[path.extname(full).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" },
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}
