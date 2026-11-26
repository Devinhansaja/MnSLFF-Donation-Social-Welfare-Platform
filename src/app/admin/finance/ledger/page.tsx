import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, usd } from "@/lib/format";
import { pageOf, PAGE_SIZE, type SP } from "@/lib/admin-utils";
import { PageHeader, Filters, Select, Pagination, StatCard } from "@/components/admin/parts";
import { link, table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Ledger({ searchParams }: { searchParams: SP }) {
  await requireStaff("view");
  const sp = await searchParams;
  const { page, skip, take } = pageOf(sp);
  const where: Prisma.LedgerEntryWhereInput = {
    ...(sp.type ? { type: sp.type } : {}),
    ...(sp.project === "general" ? { projectId: null } : sp.project ? { projectId: sp.project } : {}),
  };
  const [rows, total, sum, projects] = await Promise.all([
    db.ledgerEntry.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { project: { select: { code: true, id: true } }, donation: { select: { id: true, reference: true } } } }),
    db.ledgerEntry.count({ where }),
    db.ledgerEntry.aggregate({ where, _sum: { amountCents: true } }),
    db.project.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true } }),
  ]);
  return (
    <div>
      <PageHeader title="Financial ledger" intro="Append-only. Entries are created by confirmations, fees, refunds, paid expenses and approved adjustments — never edited or deleted." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3"><StatCard label="Entries (filtered)" value={total} /><StatCard label="Balance (filtered)" value={usd(sum._sum.amountCents ?? 0)} tone="gold" /></div>
      <Filters action="/admin/finance/ledger">
        <Select name="type" label="Type" value={sp.type} options={["DONATION", "FEE", "REFUND", "EXPENSE", "ADJUSTMENT", "TRANSFER"].map((t) => [t, t.toLowerCase()])} />
        <Select name="project" label="Fund" value={sp.project} options={[["general", "General fund"], ...projects.map((p) => [p.id, p.code] as [string, string])]} />
      </Filters>
      <div className={tableWrap}>
        <table className={table}>
          <thead><tr><th className={th}>Date</th><th className={th}>Type</th><th className={th}>Fund</th><th className={th}>Memo</th><th className={`${th} text-right`}>Amount</th></tr></thead>
          <tbody className={tbody}>
            {rows.map((l) => (
              <tr key={l.id}>
                <td className={td}>{date(l.createdAt)}</td>
                <td className={td}>{l.type}</td>
                <td className={td}>{l.project ? <Link className={link} href={`/admin/projects/${l.project.id}`}>{l.project.code}</Link> : "General"}</td>
                <td className={td}>{l.donation ? <Link className={link} href={`/admin/donations/${l.donation.id}`}>{l.memo}</Link> : l.memo}</td>
                <td className={`${td} font-num text-right ${l.amountCents < 0 ? "text-urgent" : "text-success"}`}>{usd(l.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} size={PAGE_SIZE} sp={sp} base="/admin/finance/ledger" />
    </div>
  );
}
