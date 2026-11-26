import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { date, usd } from "@/lib/format";
import { PageHeader, Section, Empty } from "@/components/admin/parts";
import { SubmitButton } from "@/components/forms";
import { requestAdjustment } from "@/app/actions/admin/finance";
import { table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Adjustments() {
  const user = await requireStaff("view");
  const [projects, entries, pending] = await Promise.all([
    db.project.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, title: true } }),
    db.ledgerEntry.findMany({ where: { type: { in: ["ADJUSTMENT", "TRANSFER"] } }, orderBy: { createdAt: "desc" }, include: { project: { select: { code: true } } } }),
    db.approvalRequest.count({ where: { type: "ADJUSTMENT", status: "PENDING" } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Financial adjustments" intro="Confirmed donation totals can never be edited directly. Corrections are documented ledger adjustments that require approval by a second authorised person." />
      {can(user.role, "payment.record") && (
        <Section title="Request an adjustment">
          <form action={requestAdjustment} className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="label" htmlFor="a-proj">Fund</label>
              <select id="a-proj" name="projectId" className="field"><option value="">General fund</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} {p.title}</option>)}</select>
            </div>
            <div><label className="label" htmlFor="a-amt">Amount USD (negative reduces)</label><input id="a-amt" name="amount" type="number" step="0.01" required className="field" /></div>
            <div className="md:col-span-4"><label className="label" htmlFor="a-memo">Documented reason</label><textarea id="a-memo" name="memo" rows={2} required minLength={10} className="field" /></div>
            <div><SubmitButton confirm="Submit this adjustment for second approval?">Submit for approval</SubmitButton></div>
          </form>
          {pending > 0 && <p className="mt-3 text-sm text-amber-700">{pending} adjustment(s) awaiting approval in the Approvals queue.</p>}
        </Section>
      )}
      <Section title="Approved adjustments">
        {!entries.length ? <Empty>No adjustments recorded.</Empty> : (
          <div className={tableWrap}><table className={table}><thead><tr><th className={th}>Date</th><th className={th}>Fund</th><th className={th}>Memo</th><th className={`${th} text-right`}>Amount</th></tr></thead>
            <tbody className={tbody}>{entries.map((e) => <tr key={e.id}><td className={td}>{date(e.createdAt)}</td><td className={td}>{e.project?.code ?? "General"}</td><td className={td}>{e.memo}</td><td className={`${td} font-num text-right`}>{usd(e.amountCents)}</td></tr>)}</tbody></table></div>
        )}
      </Section>
    </div>
  );
}
