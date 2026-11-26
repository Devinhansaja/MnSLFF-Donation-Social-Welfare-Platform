import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { countryName, date, flag, usd } from "@/lib/format";
import { PageHeader, Section, KV } from "@/components/admin/parts";
import { StatusPill, DemoBadge } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { approveMessage, rejectPayment, requestRefund, verifyPayment } from "@/app/actions/admin/donations";
import { link, table, tbody, td, th } from "@/components/admin/styles";

export default async function DonationDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("view");
  const { id } = await params;
  const d = await db.donation.findUnique({
    where: { id },
    include: { donor: true, project: true, budgetItem: true, transactions: { orderBy: { createdAt: "asc" } }, ledger: { orderBy: { createdAt: "asc" } }, bankTransfer: true, refunds: { orderBy: { createdAt: "desc" } } },
  });
  if (!d) notFound();
  const recorder = await db.auditLog.findFirst({ where: { entity: "donation", entityId: id, action: "donation.manual.create" }, include: { user: true } });
  const pendingVerify = ["PENDING", "PROCESSING", "INITIATED"].includes(d.status) && ["BANK_TRANSFER", "MANUAL"].includes(d.method);
  const refundable = d.amountCents - d.refundedCents;

  return (
    <div className="space-y-6">
      <PageHeader title={`Donation ${d.reference}`} intro={`${usd(d.amountCents)} · ${d.method.replaceAll("_", " ")} · created ${date(d.createdAt, "long")}`} />
      <div className="flex items-center gap-2"><StatusPill status={d.status} />{d.isDemo && <DemoBadge />}</div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="Donation">
          <KV rows={[
            ["Destination", d.project ? <Link key="p" className={link} href={`/admin/projects/${d.project.id}`}>{d.project.code} {d.project.title}</Link> : "General fund"],
            ["Item", d.budgetItem ? `${d.itemQuantity} × ${d.budgetItem.name}` : "—"],
            ["Type / frequency", `${d.kind} · ${d.frequency}`],
            ["Gross (USD)", usd(d.amountCents)],
            ["Donor-covered fee", usd(d.coveredFeeCents)],
            ["Gateway fee (net cost)", usd(d.feeCents)],
            ["Refunded", usd(d.refundedCents)],
            ["Original", `${d.originalCurrency} ${(d.originalAmount / 100).toLocaleString()} @ ${d.exchangeRate}`],
            ["Confirmed", date(d.confirmedAt, "long")],
            ["Public name", d.anonymous || !d.showName ? "Hidden (anonymous)" : "Shown"],
            ["Recorded by", recorder?.user?.name ?? "Online checkout"],
          ]} />
        </Section>
        <Section title="Donor (private)">
          <KV rows={[
            ["Name", <Link key="n" className={link} href={`/admin/donors/${d.donor.id}`}>{d.donor.fullName}</Link>],
            ["Company", d.donor.companyName ?? "—"],
            ["Email", d.donor.email],
            ["Phone", d.donor.phone ?? "—"],
            ["Country", `${flag(d.donor.country)} ${countryName(d.donor.country)}`],
            ["Type", d.donor.donorType],
          ]} />
          {d.message && (
            <div className="mt-4 rounded-xl bg-ivory p-3 text-sm dark:bg-white/5">
              <p className="italic">“{d.message}”</p>
              <p className="mt-1 text-xs text-muted">{d.messageApproved ? "Shown publicly" : "Not shown publicly"}</p>
              {can(user.role, "content.edit") && (
                <form action={approveMessage} className="mt-2">
                  <input type="hidden" name="id" value={d.id} /><input type="hidden" name="approve" value={d.messageApproved ? "0" : "1"} />
                  <SubmitButton size="sm" variant="outline">{d.messageApproved ? "Hide message" : "Approve message"}</SubmitButton>
                </form>
              )}
            </div>
          )}
        </Section>
      </div>

      {d.bankTransfer && (
        <Section title="Bank transfer">
          <KV rows={[
            ["Bank reference", d.bankTransfer.bankRef],
            ["Slip", d.bankTransfer.slipPath ? <a key="s" className={link} href={`/api/admin/slips/${d.bankTransfer.id}`} target="_blank">View uploaded slip</a> : "No slip uploaded"],
            ["Status", d.bankTransfer.status],
            ["Verified", d.bankTransfer.verifiedAt ? date(d.bankTransfer.verifiedAt, "long") : "—"],
          ]} />
        </Section>
      )}

      {pendingVerify && can(user.role, "payment.verify") && (
        <Section title="Verify payment">
          <p className="mb-3 text-sm text-muted">Check the funds have actually arrived in the bank account (match amount and reference) before verifying. Verification counts the donation towards the project immediately.</p>
          {recorder?.userId === user.id ? (
            <p className="text-sm font-medium text-amber-700">You recorded this donation, so a different finance staff member must verify it.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <form action={verifyPayment}>
                <input type="hidden" name="id" value={d.id} />
                <SubmitButton confirm={`Confirm ${usd(d.amountCents)} has been received in the bank?`}>Verify — funds received</SubmitButton>
              </form>
              <form action={rejectPayment} className="flex gap-2">
                <input type="hidden" name="id" value={d.id} />
                <input name="reason" placeholder="Reason" className="field h-11" aria-label="Rejection reason" />
                <SubmitButton variant="danger" confirm="Mark this payment as failed?">Reject</SubmitButton>
              </form>
            </div>
          )}
        </Section>
      )}

      {["PAID", "PARTIALLY_REFUNDED"].includes(d.status) && can(user.role, "refund") && (
        <Section title="Request refund (requires second approval)">
          <form action={requestRefund} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={d.id} />
            <div><label className="label" htmlFor="r-amt">Amount (USD, max {usd(refundable)})</label><input id="r-amt" name="amount" type="number" step="0.01" min="0.01" max={refundable / 100} required className="field" /></div>
            <div className="min-w-64 flex-1"><label className="label" htmlFor="r-reason">Reason</label><input id="r-reason" name="reason" required minLength={5} className="field" /></div>
            <SubmitButton variant="outline" confirm="Submit refund request for second approval?">Request refund</SubmitButton>
          </form>
        </Section>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="Gateway transactions">
          <table className={table}>
            <thead><tr><th className={th}>Event</th><th className={th}>Provider ref</th><th className={`${th} text-right`}>Amount</th><th className={`${th} text-right`}>Fee</th><th className={th}>Settlement</th></tr></thead>
            <tbody className={tbody}>
              {d.transactions.map((t) => (
                <tr key={t.id}><td className={td}>{t.eventType}<p className="text-xs text-muted">{date(t.createdAt)}</p></td><td className={`${td} font-mono text-xs`}>{t.providerRef}</td><td className={`${td} font-num text-right`}>{usd(t.amountCents)}</td><td className={`${td} font-num text-right`}>{usd(t.feeCents)}</td><td className={td}>{t.settlement}</td></tr>
              ))}
              {!d.transactions.length && <tr><td className={td} colSpan={5}>No gateway events yet.</td></tr>}
            </tbody>
          </table>
        </Section>
        <Section title="Ledger entries (immutable)">
          <table className={table}>
            <thead><tr><th className={th}>Type</th><th className={th}>Memo</th><th className={`${th} text-right`}>Amount</th></tr></thead>
            <tbody className={tbody}>
              {d.ledger.map((l) => (
                <tr key={l.id}><td className={td}>{l.type}<p className="text-xs text-muted">{date(l.createdAt)}</p></td><td className={td}>{l.memo}</td><td className={`${td} font-num text-right ${l.amountCents < 0 ? "text-urgent" : ""}`}>{usd(l.amountCents)}</td></tr>
              ))}
              {!d.ledger.length && <tr><td className={td} colSpan={3}>No ledger entries — funds are only recorded on confirmation.</td></tr>}
            </tbody>
          </table>
        </Section>
      </div>

      {d.refunds.length > 0 && (
        <Section title="Refunds">
          <ul className="text-sm">{d.refunds.map((r) => <li key={r.id} className="flex justify-between py-1"><span>{date(r.createdAt)} — {r.reason}</span><span className="font-num">{usd(r.amountCents)} · {r.status}</span></li>)}</ul>
        </Section>
      )}
    </div>
  );
}
