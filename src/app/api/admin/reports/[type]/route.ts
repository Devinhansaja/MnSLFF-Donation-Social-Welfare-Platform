import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, isStaff } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { buildReport, REPORT_TYPES, resolveRange, toCsv, toPdf, toXlsx } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const session = await getSession();
  const { type } = await params;
  const def = REPORT_TYPES[type];
  if (!def) return new Response("Unknown report", { status: 404 });
  if (!session || !isStaff(session.role)) return new Response("Unauthorized", { status: 401 });
  // Re-check the account is still active and use its current role.
  const user = await db.user.findUnique({ where: { id: session.uid } });
  if (!user || !user.active || !(can(user.role, def.perm) || can(user.role, "export"))) return new Response("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "csv";
  let range;
  try {
    range = resolveRange(type, url.searchParams.get("from"), url.searchParams.get("to"));
  } catch {
    return new Response("Invalid date range", { status: 400 });
  }
  const report = await buildReport(type, range.from, range.to);
  const stamp = `${range.from.toISOString().slice(0, 10)}_${range.to.toISOString().slice(0, 10)}`;
  const base = `mnslff-${type}-${stamp}`;
  await audit(user.id, "report.export", "report", type, `${format} ${stamp} (${report.rows.length} rows)`);

  const headers = (ct: string, ext: string) => ({
    "Content-Type": ct,
    "Content-Disposition": `attachment; filename="${base}.${ext}"`,
    "Cache-Control": "private, no-store",
  });
  if (format === "xlsx") return new Response(new Uint8Array(await toXlsx(report)), { headers: headers("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx") });
  if (format === "pdf") return new Response(new Uint8Array(await toPdf(report)), { headers: headers("application/pdf", "pdf") });
  return new Response(toCsv(report), { headers: headers("text/csv; charset=utf-8", "csv") });
}
