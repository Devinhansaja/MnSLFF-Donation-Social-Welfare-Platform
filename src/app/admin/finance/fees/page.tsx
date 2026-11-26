import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { CONFIRMED_STATUSES, sumDonations } from "@/lib/finance";
import { usd } from "@/lib/format";
import { PageHeader, Empty } from "@/components/admin/parts";
import { table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Fees() {
  await requireStaff("view");
  const rows = await db.donation.findMany({ where: { status: { in: [...CONFIRMED_STATUSES] } }, select: { method: true, amountCents: true, feeCents: true, refundedCents: true, status: true, coveredFeeCents: true } });
  const methods = [...new Set(rows.map((r) => r.method))];
  const data = methods.map((m) => {
    const sub = rows.filter((r) => r.method === m);
    const t = sumDonations(sub);
    return { m, ...t, covered: sub.reduce((s, r) => s + r.coveredFeeCents, 0), rate: t.grossReceived ? (t.fees / t.grossReceived) * 100 : 0 };
  });
  const all = sumDonations(rows);
  return (
    <div>
      <PageHeader title="Gateway fees" intro="Fees are the actual processor charges recorded at confirmation, net of any fee the donor chose to cover." />
      {!data.length ? <Empty>No confirmed payments yet.</Empty> : (
        <div className={tableWrap}>
          <table className={table}>
            <thead><tr><th className={th}>Method</th><th className={`${th} text-right`}>Payments</th><th className={`${th} text-right`}>Gross</th><th className={`${th} text-right`}>Donor-covered fees</th><th className={`${th} text-right`}>Net fee cost</th><th className={`${th} text-right`}>Effective rate</th><th className={`${th} text-right`}>Net</th></tr></thead>
            <tbody className={tbody}>
              {data.map((r) => (
                <tr key={r.m}>
                  <td className={td}>{r.m.replaceAll("_", " ")}</td>
                  <td className={`${td} font-num text-right`}>{r.count}</td>
                  <td className={`${td} font-num text-right`}>{usd(r.gross)}</td>
                  <td className={`${td} font-num text-right`}>{usd(r.covered)}</td>
                  <td className={`${td} font-num text-right`}>{usd(r.fees)}</td>
                  <td className={`${td} font-num text-right`}>{r.rate.toFixed(2)}%</td>
                  <td className={`${td} font-num text-right`}>{usd(r.net)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="font-semibold"><td className={td}>Total</td><td className={`${td} text-right`}>{all.count}</td><td className={`${td} text-right`}>{usd(all.gross)}</td><td className={td} /><td className={`${td} text-right`}>{usd(all.fees)}</td><td className={td} /><td className={`${td} text-right`}>{usd(all.net)}</td></tr></tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
