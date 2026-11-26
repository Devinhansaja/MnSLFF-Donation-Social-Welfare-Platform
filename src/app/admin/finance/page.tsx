import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getSiteStats } from "@/lib/queries";
import { db } from "@/lib/db";
import { usd } from "@/lib/format";
import { PageHeader, Section, StatCard } from "@/components/admin/parts";
import { link } from "@/components/admin/styles";

export default async function FinanceDashboard() {
  await requireStaff("view");
  const [s, pendingApprovals, ledgerSum, unsettled] = await Promise.all([
    getSiteStats(),
    db.approvalRequest.count({ where: { status: "PENDING" } }),
    db.ledgerEntry.aggregate({ _sum: { amountCents: true } }),
    db.transaction.count({ where: { settlement: "UNSETTLED", status: "PAID" } }),
  ]);
  const ledgerBalance = ledgerSum._sum.amountCents ?? 0;
  return (
    <div className="space-y-6">
      <PageHeader title="Financial dashboard" intro="Calculated from confirmed donations and expense records. The ledger balance should equal the available balance plus any approved adjustments." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Gross donations received" value={usd(s.grossReceived)} />
        <StatCard label="Refunds & reversals" value={usd(s.refunds)} tone={s.refunds ? "bad" : undefined} />
        <StatCard label="Gross collected" value={usd(s.gross)} tone="good" />
        <StatCard label="Payment processing fees" value={usd(s.fees)} />
        <StatCard label="Net donations" value={usd(s.net)} />
        <StatCard label="Project expenses (paid)" value={usd(s.projectExpenses)} />
        <StatCard label="Administrative expenses (paid)" value={usd(s.adminExpenses)} />
        <StatCard label="Outstanding commitments" value={usd(s.commitments)} tone="warn" sub="Approved but unpaid" />
        <StatCard label="Available fund balance" value={usd(s.available)} tone="gold" />
        <StatCard label="Ledger balance" value={usd(ledgerBalance)} sub={ledgerBalance === s.available ? "Matches available balance ✓" : "Differs — check adjustments"} tone={ledgerBalance === s.available ? "good" : "warn"} />
        <StatCard label="Remaining project requirements" value={usd(s.remaining)} />
        <StatCard label="Pending approvals" value={pendingApprovals} tone={pendingApprovals ? "warn" : undefined} />
      </div>
      <Section title="Finance workspace">
        <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["/admin/finance/budgets", "Project budgets & balances"], ["/admin/finance/expenses", "Expenses & approvals"], ["/admin/approvals", `Approvals queue (${pendingApprovals})`],
            ["/admin/finance/reconciliation", `Bank reconciliation (${unsettled} unsettled)`], ["/admin/finance/fees", "Gateway fees"], ["/admin/finance/refunds", "Refunds"],
            ["/admin/finance/ledger", "Immutable ledger"], ["/admin/finance/adjustments", "Financial adjustments"], ["/admin/reports", "Reports & exports"],
          ].map(([h, l]) => <li key={h}><Link href={h} className={link}>{l} →</Link></li>)}
        </ul>
      </Section>
    </div>
  );
}
