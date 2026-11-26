import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { date, usd } from "@/lib/format";
import { type SP } from "@/lib/admin-utils";
import { PageHeader, Filters, Select, StatCard, Empty } from "@/components/admin/parts";
import { SubmitButton } from "@/components/forms";
import { setSettlement } from "@/app/actions/admin/finance";
import { link, table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Reconciliation({ searchParams }: { searchParams: SP }) {
  const user = await requireStaff("view");
  const sp = await searchParams;
  const settlement = sp.settlement ?? "UNSETTLED";
  const [rows, groups, pendingBank] = await Promise.all([
    db.transaction.findMany({ where: { status: "PAID", ...(settlement !== "ALL" ? { settlement } : {}) }, orderBy: { createdAt: "asc" }, take: 200, include: { donation: { select: { id: true, reference: true, bankTransfer: true } } } }),
    db.transaction.groupBy({ by: ["settlement"], where: { status: "PAID" }, _sum: { netCents: true }, _count: true }),
    db.bankTransfer.count({ where: { status: "PENDING" } }),
  ]);
  const g = (s: string) => groups.find((x) => x.settlement === s);
  return (
    <div className="space-y-4">
      <PageHeader title="Bank reconciliation" intro="Match each confirmed payment against the bank statement: Unsettled → Settled (funds landed) → Reconciled (matched to statement line)." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {["UNSETTLED", "SETTLED", "RECONCILED"].map((s) => <StatCard key={s} label={`${s.toLowerCase()} (${g(s)?._count ?? 0})`} value={usd(g(s)?._sum.netCents ?? 0)} sub="Net settlement amount" />)}
        <StatCard label="Bank transfers awaiting verification" value={pendingBank} tone={pendingBank ? "warn" : undefined} sub="See Pending Donations" />
      </div>
      <Filters action="/admin/finance/reconciliation">
        <Select name="settlement" label="Settlement" value={settlement} options={[["UNSETTLED", "Unsettled"], ["SETTLED", "Settled"], ["RECONCILED", "Reconciled"], ["ALL", "All"]]} />
      </Filters>
      {!rows.length ? <Empty>Nothing in this state.</Empty> : (
        <div className={tableWrap}>
          <table className={table}>
            <thead><tr><th className={th}>Date</th><th className={th}>Donation</th><th className={th}>Gateway / bank ref</th><th className={`${th} text-right`}>Gross</th><th className={`${th} text-right`}>Fee</th><th className={`${th} text-right`}>Net expected</th><th className={th}>State</th><th className={th}>Action</th></tr></thead>
            <tbody className={tbody}>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className={td}>{date(t.createdAt)}</td>
                  <td className={td}><Link className={`${link} font-mono text-xs`} href={`/admin/donations/${t.donation.id}`}>{t.donation.reference}</Link></td>
                  <td className={td}>{t.gateway}<p className="font-mono text-xs text-muted">{t.donation.bankTransfer?.bankRef ?? t.providerRef}</p></td>
                  <td className={`${td} font-num text-right`}>{usd(t.amountCents)}</td>
                  <td className={`${td} font-num text-right`}>{usd(t.feeCents)}</td>
                  <td className={`${td} font-num text-right font-semibold`}>{usd(t.netCents)}</td>
                  <td className={td}>{t.settlement}</td>
                  <td className={td}>
                    {can(user.role, "payment.verify") && (
                      <div className="flex gap-1.5">
                        {t.settlement === "UNSETTLED" && <form action={setSettlement}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="settlement" value="SETTLED" /><SubmitButton size="sm" variant="outline">Settled</SubmitButton></form>}
                        {t.settlement !== "RECONCILED" && <form action={setSettlement}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="settlement" value="RECONCILED" /><SubmitButton size="sm" confirm="Mark as reconciled against the bank statement?">Reconcile</SubmitButton></form>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
