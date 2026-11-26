import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { readPrivateFile } from "@/lib/uploads";

/** Serves a private bank-transfer slip to finance staff only. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s || !can(s.role, "payment.verify")) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const bt = await db.bankTransfer.findUnique({ where: { id } });
  if (!bt?.slipPath) return new Response("Not found", { status: 404 });
  const file = await readPrivateFile(bt.slipPath);
  if (!file) return new Response("File missing", { status: 404 });
  return new Response(file.data, {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `inline; filename="slip-${id}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
