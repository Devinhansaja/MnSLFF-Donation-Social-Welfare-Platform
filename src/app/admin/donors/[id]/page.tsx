import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { sumDonations } from "@/lib/finance";
import { countryName, date, flag, usd } from "@/lib/format";
import { PageHeader, Section, StatCard, KV } from "@/components/admin/parts";
import { StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { updateDonorConsent } from "@/app/actions/admin/people";
import { link, table, tbody, td, th } from "@/components/admin/styles";

export default async function DonorDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("view");
  const { id } = await params;
  const d = await db.donor.findUnique({ where: { id }, include: { user: true, donations: { orderBy: { createdAt: "desc" }, include: { project: { select: { code: true, title: true } } } } } });
  if (!d) notFound();
  const t = sumDonations(d.donations);
  return (
    <div className="space-y-6">
      <PageHeader title={d.fullName} intro={`${flag(d.country)} ${countryName(d.country)} · ${d.donorType.toLowerCase()} donor`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Lifetime gross" value={usd(t.gross)} tone="good" />
        <StatCard label="Confirmed gifts" value={t.count} />
        <StatCard label="Refunded" value={usd(t.refunds)} />
        <StatCard label="Portal account" value={d.user ? "Yes" : "Guest"} />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="Private contact details">
          <KV rows={[["Email", d.email], ["Phone", d.phone ?? "—"], ["Company", d.companyName ?? "—"], ["Since", date(d.createdAt, "long")]]} />
        </Section>
        <Section title="Recognition & consent">
          {can(user.role, "content.edit") ? (
            <form action={updateDonorConsent} className="grid gap-3">
              <input type="hidden" name="id" value={d.id} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="label" htmlFor="d-type">Donor type</label><select id="d-type" name="donorType" defaultValue={d.donorType} className="field"><option value="INDIVIDUAL">Individual</option><option value="CORPORATE">Corporate</option><option value="ORGANIZATION">Organization</option></select></div>
                <div><label className="label" htmlFor="d-co">Company name</label><input id="d-co" name="companyName" defaultValue={d.companyName ?? ""} className="field" /></div>
              </div>
              <div><label className="label" htmlFor="d-logo">Corporate logo URL</label><input id="d-logo" name="logoUrl" defaultValue={d.logoUrl ?? ""} className="field" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publicProfile" defaultChecked={d.publicProfile} className="size-4 accent-forest" /> Listed in public donor directory (with consent)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showTotals" defaultChecked={d.showTotals} className="size-4 accent-forest" /> Show donation totals publicly (with consent)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notifyUpdates" defaultChecked={d.notifyUpdates} className="size-4 accent-forest" /> Receives project update notifications</label>
              <div><SubmitButton confirm="Confirm the donor has consented to these settings?">Save preferences</SubmitButton></div>
            </form>
          ) : (
            <KV rows={[["Public profile", d.publicProfile ? "Yes" : "No"], ["Show totals", d.showTotals ? "Yes" : "No"]]} />
          )}
        </Section>
      </div>
      <Section title="Donation history">
        <table className={table}>
          <thead><tr><th className={th}>Ref</th><th className={th}>Project</th><th className={th}>Date</th><th className={`${th} text-right`}>Amount</th><th className={th}>Status</th></tr></thead>
          <tbody className={tbody}>
            {d.donations.map((x) => (
              <tr key={x.id}>
                <td className={td}><Link className={`${link} font-mono text-xs`} href={`/admin/donations/${x.id}`}>{x.reference}</Link></td>
                <td className={td}>{x.project ? `${x.project.code} ${x.project.title}` : "General fund"}</td>
                <td className={td}>{date(x.confirmedAt ?? x.createdAt)}</td>
                <td className={`${td} font-num text-right`}>{usd(x.amountCents)}</td>
                <td className={td}><StatusPill status={x.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
