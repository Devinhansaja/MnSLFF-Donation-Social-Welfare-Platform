import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { sumExpenses } from "@/lib/finance";
import { date, usd } from "@/lib/format";
import { type SP } from "@/lib/admin-utils";
import { PageHeader, Filters, Select, Section, StatCard, Empty } from "@/components/admin/parts";
import { StatusPill, DemoBadge } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { createExpense, decideExpense, requestExpensePayment } from "@/app/actions/admin/finance";
import { link, table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Expenses({ searchParams }: { searchParams: SP }) {
  const user = await requireStaff("view");
  const sp = await searchParams;
  const where: Prisma.ExpenseWhereInput = {
    ...(sp.admin ? { administrative: true } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.project ? { projectId: sp.project } : {}),
  };
  const [rows, projects, openPayReqs] = await Promise.all([
    db.expense.findMany({ where, orderBy: { date: "desc" }, include: { project: { select: { code: true, id: true } }, milestone: true, createdBy: true, approvedBy: true } }),
    db.project.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, title: true, milestones: { select: { id: true, title: true }, orderBy: { sortOrder: "asc" } } } }),
    db.approvalRequest.findMany({ where: { type: "EXPENSE_PAYMENT", status: "PENDING" }, select: { entityId: true } }),
  ]);
  const t = sumExpenses(rows);
  const awaitingPay = new Set(openPayReqs.map((r) => r.entityId));

  return (
    <div className="space-y-6">
      <PageHeader title={sp.admin ? "Administrative expenses" : "Project expenses"} intro="Workflow: Pending → Approved (commitment, by a different person) → Paid (fund release approved by a second person in the Approvals queue)." />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Paid" value={usd(t.paid)} />
        <StatCard label="Approved commitments" value={usd(t.committed)} tone="warn" />
        <StatCard label="Pending approval" value={usd(t.pending)} />
      </div>

      {can(user.role, "expense.create") && (
        <Section title="Record an expense">
          <form action={createExpense} className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><label className="label" htmlFor="e-title">Title</label><input id="e-title" name="title" required className="field" /></div>
            <div><label className="label" htmlFor="e-cat">Category</label><input id="e-cat" name="category" required placeholder="Materials, Labour…" className="field" list="exp-cats" />
              <datalist id="exp-cats">{["Materials", "Construction", "Labour", "Equipment", "Medical services", "Medical supplies", "Transport", "Food supplies", "Administration"].map((c) => <option key={c} value={c} />)}</datalist></div>
            <div><label className="label" htmlFor="e-amt">Amount (USD)</label><input id="e-amt" name="amount" type="number" step="0.01" min="0.01" required className="field" /></div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="e-proj">Project</label>
              <select id="e-proj" name="projectId" className="field" defaultValue={sp.project ?? ""}>
                <option value="">— none (administrative) —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.code} {p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="e-ms">Related milestone</label>
              <select id="e-ms" name="milestoneId" className="field">
                <option value="">—</option>
                {projects.map((p) => (
                  <optgroup key={p.id} label={p.code}>{p.milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</optgroup>
                ))}
              </select>
            </div>
            <div><label className="label" htmlFor="e-date">Date</label><input id="e-date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="field" /></div>
            <div className="md:col-span-2"><label className="label" htmlFor="e-desc">Description</label><input id="e-desc" name="description" className="field" /></div>
            <div className="md:col-span-2"><label className="label" htmlFor="e-inv">Redacted invoice URL</label><input id="e-inv" name="invoiceUrl" className="field" placeholder="Link to redacted invoice (no personal data)" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="administrative" defaultChecked={!!sp.admin} className="size-4 accent-forest" /> Administrative expense</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublic" defaultChecked className="size-4 accent-forest" /> Show on public project page</label>
            <div className="md:col-span-2 md:text-right"><SubmitButton>Record expense</SubmitButton></div>
          </form>
        </Section>
      )}

      <Filters action={`/admin/finance/expenses`}>
        <Select name="status" label="Status" value={sp.status} options={[["PENDING", "Pending"], ["APPROVED", "Approved"], ["PAID", "Paid"], ["REJECTED", "Rejected"]]} />
        <Select name="project" label="Project" value={sp.project} options={projects.map((p) => [p.id, p.code])} />
        {sp.admin && <input type="hidden" name="admin" value="1" />}
      </Filters>

      {rows.length === 0 ? <Empty>No expenses recorded.</Empty> : (
        <div className={tableWrap}>
          <table className={table}>
            <thead><tr><th className={th}>Expense</th><th className={th}>Project</th><th className={th}>Date</th><th className={`${th} text-right`}>Amount</th><th className={th}>Status</th><th className={th}>People</th><th className={th}>Actions</th></tr></thead>
            <tbody className={tbody}>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className={td}>{e.title}<p className="text-xs text-muted">{e.category}{e.administrative && " · administrative"}{!e.isPublic && " · private"}{e.milestone && ` · ${e.milestone.title}`}</p>{e.isDemo && <DemoBadge />}</td>
                  <td className={td}>{e.project ? <Link className={link} href={`/admin/projects/${e.project.id}`}>{e.project.code}</Link> : "General"}</td>
                  <td className={td}>{date(e.date)}</td>
                  <td className={`${td} font-num text-right`}>{usd(e.amountCents)}</td>
                  <td className={td}><StatusPill status={e.status === "APPROVED" ? "PROCESSING" : e.status === "REJECTED" ? "FAILED" : e.status} label={e.status.toLowerCase()} /></td>
                  <td className={`${td} text-xs`}>By {e.createdBy?.name ?? "—"}{e.approvedBy && <><br />Approved {e.approvedBy.name}</>}</td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1.5">
                      {e.status === "PENDING" && can(user.role, "expense.approve") && e.createdById !== user.id && (
                        <>
                          <form action={decideExpense}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="decision" value="APPROVE" /><SubmitButton size="sm" confirm={`Approve ${usd(e.amountCents)} expense?`}>Approve</SubmitButton></form>
                          <form action={decideExpense}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="decision" value="REJECT" /><SubmitButton size="sm" variant="outline" confirm="Reject this expense?">Reject</SubmitButton></form>
                        </>
                      )}
                      {e.status === "PENDING" && e.createdById === user.id && <span className="text-xs text-muted">Awaiting another approver</span>}
                      {e.status === "APPROVED" && (awaitingPay.has(e.id) ? <span className="text-xs text-muted">Payment awaiting approval</span> : can(user.role, "expense.create") && (
                        <form action={requestExpensePayment}><input type="hidden" name="id" value={e.id} /><SubmitButton size="sm" variant="outline" confirm="Request release of funds for this expense?">Request payment</SubmitButton></form>
                      ))}
                    </div>
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
