import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { date } from "@/lib/format";
import { PageHeader, Section, Empty } from "@/components/admin/parts";
import { SubmitButton } from "@/components/forms";
import { addExchangeRate } from "@/app/actions/admin/finance";
import { table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Exchange() {
  const user = await requireStaff("view");
  const [rates, lkrDonations] = await Promise.all([
    db.exchangeRate.findMany({ orderBy: { date: "desc" }, take: 50 }),
    db.donation.findMany({ where: { originalCurrency: { not: "USD" } }, orderBy: { createdAt: "desc" }, take: 50, select: { reference: true, originalCurrency: true, originalAmount: true, exchangeRate: true, amountCents: true, createdAt: true } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Currency settings & exchange records" intro="USD is the base and reporting currency. LKR payments store the original amount, the applied rate and the USD equivalent; rates are never applied retroactively." />
      <Section title="Currency settings">
        <ul className="text-sm text-muted">
          <li>Base / donation currency: <strong className="text-navy dark:text-white">USD</strong></li>
          <li>Accepted secondary currency: <strong className="text-navy dark:text-white">LKR</strong> (only via approved local gateways or manual entry)</li>
          <li>Current LKR rate: <strong className="text-navy dark:text-white">{rates[0] ? `${(1 / rates[0].usdPerUnit).toFixed(2)} LKR = 1 USD (${date(rates[0].date)})` : "not set"}</strong></li>
        </ul>
        {can(user.role, "payment.record") && (
          <form action={addExchangeRate} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="currency" value="LKR" />
            <div><label className="label" htmlFor="x-rate">New rate: LKR per 1 USD</label><input id="x-rate" name="lkrPerUsd" type="number" step="0.01" min="1" required className="field" /></div>
            <SubmitButton confirm="Record this exchange rate? It applies to new LKR transactions only.">Record rate</SubmitButton>
          </form>
        )}
      </Section>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="Rate history">
          {!rates.length ? <Empty>No rates.</Empty> : (
            <div className={tableWrap}><table className={table}><thead><tr><th className={th}>Date</th><th className={th}>Currency</th><th className={`${th} text-right`}>LKR per USD</th><th className={`${th} text-right`}>USD per LKR</th></tr></thead>
              <tbody className={tbody}>{rates.map((r) => <tr key={r.id}><td className={td}>{date(r.date)}</td><td className={td}>{r.currency}</td><td className={`${td} font-num text-right`}>{(1 / r.usdPerUnit).toFixed(2)}</td><td className={`${td} font-num text-right`}>{r.usdPerUnit.toFixed(6)}</td></tr>)}</tbody></table></div>
          )}
        </Section>
        <Section title="Converted donations">
          {!lkrDonations.length ? <Empty>No non-USD donations recorded yet.</Empty> : (
            <div className={tableWrap}><table className={table}><thead><tr><th className={th}>Ref</th><th className={`${th} text-right`}>Original</th><th className={`${th} text-right`}>Rate</th><th className={`${th} text-right`}>USD</th></tr></thead>
              <tbody className={tbody}>{lkrDonations.map((d) => <tr key={d.reference}><td className={`${td} font-mono text-xs`}>{d.reference}</td><td className={`${td} font-num text-right`}>{d.originalCurrency} {(d.originalAmount / 100).toLocaleString()}</td><td className={`${td} font-num text-right`}>{d.exchangeRate}</td><td className={`${td} font-num text-right`}>${(d.amountCents / 100).toFixed(2)}</td></tr>)}</tbody></table></div>
          )}
        </Section>
      </div>
    </div>
  );
}
