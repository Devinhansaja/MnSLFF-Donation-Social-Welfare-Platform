import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, usd } from "@/lib/format";
import { PageHeader, Empty } from "@/components/admin/parts";
import { StatusPill } from "@/components/ui";
import { link, table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Refunds() {
  await requireStaff("view");
  const rows = await db.refund.findMany({ orderBy: { createdAt: "desc" }, include: { donation: { include: { donor: true, project: { select: { code: true } } } } } });
  return (
    <div>
      <PageHeader title="Refund management" intro="Refunds are requested from a donation's page and applied only after a second authorised approval. Processing fees already charged are not recovered." />
      {!rows.length ? <Empty>No refunds requested. Open a confirmed donation to request one.</Empty> : (
        <div className={tableWrap}>
          <table className={table}>
            <thead><tr><th className={th}>Requested</th><th className={th}>Donation</th><th className={th}>Donor</th><th className={th}>Project</th><th className={th}>Reason</th><th className={`${th} text-right`}>Amount</th><th className={th}>Status</th></tr></thead>
            <tbody className={tbody}>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{date(r.createdAt)}</td>
                  <td className={td}><Link className={`${link} font-mono text-xs`} href={`/admin/donations/${r.donationId}`}>{r.donation.reference}</Link></td>
                  <td className={td}>{r.donation.donor.fullName}</td>
                  <td className={td}>{r.donation.project?.code ?? "General"}</td>
                  <td className={td}>{r.reason}</td>
                  <td className={`${td} font-num text-right`}>{usd(r.amountCents)}</td>
                  <td className={td}><StatusPill status={r.status === "APPROVED" ? "REFUNDED" : r.status === "REJECTED" ? "FAILED" : "PENDING"} label={r.status.toLowerCase()} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
