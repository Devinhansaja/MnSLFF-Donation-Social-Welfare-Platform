import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { readPrivateFile } from "@/lib/uploads";

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
  const ref = typeof entry === "string" ? entry : entry && typeof entry === "object" && "path" in entry ? String((entry as { path: unknown }).path) : null;
  if (!ref) return new Response("Not found", { status: 404 });
  const file = await readPrivateFile(ref);
  if (!file) return new Response("File missing", { status: 404 });
  return new Response(file.data, {
    headers: { "Content-Type": file.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" },
  });
}
