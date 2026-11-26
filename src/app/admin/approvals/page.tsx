import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { canApproveRequest } from "@/lib/rbac";
import { date, usd } from "@/lib/format";
import { PageHeader, Empty } from "@/components/admin/parts";
import { StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { decideApproval } from "@/app/actions/admin/donations";
import { table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Approvals() {
  const user = await requireStaff("view");
  const [pending, decided] = await Promise.all([
    db.approvalRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { requestedBy: true } }),
    db.approvalRequest.findMany({ where: { status: { not: "PENDING" } }, orderBy: { decidedAt: "desc" }, take: 30, include: { requestedBy: true, approvedBy: true } }),
  ]);
  const summary = (s: string) => s.split("||")[0];
  return (
    <div className="space-y-8">
      <PageHeader title="Approvals queue" intro="Dual control: refunds, expense payments and financial adjustments need a second authorised person. You can never approve your own request." />
      {pending.length === 0 ? <Empty>Nothing waiting for approval.</Empty> : (
        <div className={tableWrap}>
          <table className={table}>
            <thead><tr><th className={th}>Type</th><th className={th}>Summary</th><th className={`${th} text-right`}>Amount</th><th className={th}>Requested by</th><th className={th}>Decision</th></tr></thead>
            <tbody className={tbody}>
              {pending.map((r) => {
                const allowed = canApproveRequest(user, r);
                return (
                  <tr key={r.id}>
                    <td className={td}><StatusPill status="PENDING" label={r.type.replace("_", " ").toLowerCase()} /></td>
                    <td className={td}>{summary(r.summary)}</td>
                    <td className={`${td} font-num text-right`}>{usd(r.amountCents)}</td>
                    <td className={td}>{r.requestedBy.name}<p className="text-xs text-muted">{date(r.createdAt)}</p></td>
                    <td className={td}>
                      {allowed ? (
                        <div className="flex gap-2">
                          <form action={decideApproval}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="APPROVE" /><SubmitButton size="sm" confirm={`Approve this ${r.type.toLowerCase()} of ${usd(r.amountCents)}? This changes the financial ledger.`}>Approve</SubmitButton></form>
                          <form action={decideApproval}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="REJECT" /><SubmitButton size="sm" variant="outline" confirm="Reject this request?">Reject</SubmitButton></form>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">{r.requestedById === user.id ? "Your request — awaiting another approver" : "Requires a different role"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div>
        <h2 className="mb-3 font-semibold">Recent decisions</h2>
        {decided.length === 0 ? <Empty>No decisions yet.</Empty> : (
          <div className={tableWrap}>
            <table className={table}>
              <thead><tr><th className={th}>Type</th><th className={th}>Summary</th><th className={`${th} text-right`}>Amount</th><th className={th}>Requested</th><th className={th}>Decided</th><th className={th}>Result</th></tr></thead>
              <tbody className={tbody}>
                {decided.map((r) => (
                  <tr key={r.id}>
                    <td className={td}>{r.type}</td><td className={td}>{summary(r.summary)}</td><td className={`${td} font-num text-right`}>{usd(r.amountCents)}</td>
                    <td className={td}>{r.requestedBy.name}</td><td className={td}>{r.approvedBy?.name} · {date(r.decidedAt)}</td>
                    <td className={td}><StatusPill status={r.status === "APPROVED" ? "PAID" : "FAILED"} label={r.status.toLowerCase()} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
