import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, usd } from "@/lib/format";
import { pageOf, PAGE_SIZE, type SP } from "@/lib/admin-utils";
import { PageHeader, Filters, Select, TextFilter, Pagination, Empty } from "@/components/admin/parts";
import { StatusPill } from "@/components/ui";
import { link, table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Transactions({ searchParams }: { searchParams: SP }) {
  await requireStaff("view");
  const sp = await searchParams;
  const { page, skip, take } = pageOf(sp);
  const where: Prisma.TransactionWhereInput = {
    ...(sp.gateway ? { gateway: sp.gateway } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.q ? { OR: [{ providerRef: { contains: sp.q, mode: "insensitive" } }, { donation: { reference: { contains: sp.q, mode: "insensitive" } } }] } : {}),
  };
  const [rows, total, gateways] = await Promise.all([
    db.transaction.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { donation: { select: { id: true, reference: true } } } }),
    db.transaction.count({ where }),
    db.transaction.findMany({ distinct: ["gateway"], select: { gateway: true } }),
  ]);
  return (
    <div>
      <PageHeader title="Payment transactions" intro="Raw gateway events. Duplicate events are recorded as IGNORED and never double-count." />
      <Filters action="/admin/finance/transactions">
        <TextFilter name="q" label="Search" value={sp.q} placeholder="Provider ref or donation ref" />
        <Select name="gateway" label="Gateway" value={sp.gateway} options={gateways.map((g) => [g.gateway, g.gateway])} />
        <Select name="status" label="Status" value={sp.status} options={[["PAID", "Paid"], ["FAILED", "Failed"], ["CANCELLED", "Cancelled"], ["IGNORED", "Ignored (duplicate)"]]} />
      </Filters>
      {!rows.length ? <Empty>No transactions.</Empty> : (
        <div className={tableWrap}>
          <table className={table}>
            <thead><tr><th className={th}>Date</th><th className={th}>Donation</th><th className={th}>Gateway</th><th className={th}>Provider ref</th><th className={th}>Event</th><th className={`${th} text-right`}>Amount</th><th className={`${th} text-right`}>Fee</th><th className={`${th} text-right`}>Net</th><th className={th}>Settlement</th></tr></thead>
            <tbody className={tbody}>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className={td}>{date(t.createdAt)}</td>
                  <td className={td}><Link className={`${link} font-mono text-xs`} href={`/admin/donations/${t.donation.id}`}>{t.donation.reference}</Link></td>
                  <td className={td}>{t.gateway}</td>
                  <td className={`${td} font-mono text-xs`}>{t.providerRef}</td>
                  <td className={td}><StatusPill status={t.status} label={t.eventType} /></td>
                  <td className={`${td} font-num text-right`}>{usd(t.amountCents)}</td>
                  <td className={`${td} font-num text-right`}>{usd(t.feeCents)}</td>
                  <td className={`${td} font-num text-right`}>{usd(t.netCents)}</td>
                  <td className={td}>{t.settlement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} size={PAGE_SIZE} sp={sp} base="/admin/finance/transactions" />
    </div>
  );
}
