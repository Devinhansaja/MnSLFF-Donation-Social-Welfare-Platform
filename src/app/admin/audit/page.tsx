import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { pageOf, PAGE_SIZE, type SP } from "@/lib/admin-utils";
import { PageHeader, Filters, Select, TextFilter, Pagination } from "@/components/admin/parts";
import { btn } from "@/components/ui";
import { table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Audit({ searchParams }: { searchParams: SP }) {
  await requireStaff("view");
  const sp = await searchParams;
  const { page, skip, take } = pageOf(sp);
  const where: Prisma.AuditLogWhereInput = {
    ...(sp.entity ? { entity: sp.entity } : {}),
    ...(sp.user ? { userId: sp.user } : {}),
    ...(sp.q ? { OR: [{ action: { contains: sp.q, mode: "insensitive" } }, { detail: { contains: sp.q, mode: "insensitive" } }, { entityId: { contains: sp.q, mode: "insensitive" } }] } : {}),
    ...(sp.from || sp.to ? { createdAt: { ...(sp.from ? { gte: new Date(`${sp.from}T00:00:00`) } : {}), ...(sp.to ? { lte: new Date(`${sp.to}T23:59:59`) } : {}) } } : {}),
  };
  const [rows, total, entities, users] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { user: { select: { name: true, email: true } } } }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ distinct: ["entity"], select: { entity: true } }),
    db.user.findMany({ where: { auditLogs: { some: {} } }, select: { id: true, name: true } }),
  ]);
  return (
    <div>
      <PageHeader title="Audit logs" intro="Every sign-in, approval, payment verification and settings change is recorded here and cannot be edited from the admin panel." actions={
        // eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page
        <a href="/api/admin/reports/audit?format=csv" className={btn("outline", "sm")}>Export CSV</a>} />
      <Filters action="/admin/audit">
        <TextFilter name="q" label="Search" value={sp.q} placeholder="Action, detail, ID" />
        <Select name="entity" label="Entity" value={sp.entity} options={entities.map((e) => [e.entity, e.entity])} />
        <Select name="user" label="User" value={sp.user} options={users.map((u) => [u.id, u.name])} />
        <TextFilter name="from" label="From" type="date" value={sp.from} />
        <TextFilter name="to" label="To" type="date" value={sp.to} />
      </Filters>
      <div className={tableWrap}>
        <table className={table}>
          <thead><tr><th className={th}>Time</th><th className={th}>User</th><th className={th}>Action</th><th className={th}>Entity</th><th className={th}>Detail</th></tr></thead>
          <tbody className={tbody}>
            {rows.map((l) => (
              <tr key={l.id}>
                <td className={`${td} whitespace-nowrap font-mono text-xs`}>{l.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td>
                <td className={td}>{l.user?.name ?? "System / anonymous"}</td>
                <td className={td}>{l.action}</td>
                <td className={`${td} text-xs`}>{l.entity}{l.entityId && <span className="block font-mono text-muted">{l.entityId.slice(0, 14)}</span>}</td>
                <td className={`${td} max-w-md break-words text-xs`}>{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} size={PAGE_SIZE} sp={sp} base="/admin/audit" />
    </div>
  );
}
