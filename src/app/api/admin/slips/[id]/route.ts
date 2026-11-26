import fs from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";

const TYPES: Record<string, string> = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

/** Serves a private bank-transfer slip to finance staff only. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s || !can(s.role, "payment.verify")) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const bt = await db.bankTransfer.findUnique({ where: { id } });
  if (!bt?.slipPath) return new Response("Not found", { status: 404 });
  const root = path.resolve(process.cwd(), "storage");
  const full = path.resolve(root, bt.slipPath.replace(/^storage[\\/]/, ""));
  if (!full.startsWith(root)) return new Response("Forbidden", { status: 403 });
  try {
    const buf = await fs.readFile(full);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[path.extname(full).toLowerCase()] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="slip-${id}${path.extname(full)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}
