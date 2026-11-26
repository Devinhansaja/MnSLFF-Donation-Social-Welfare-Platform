import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, usd } from "@/lib/format";
import { PageHeader, Section } from "@/components/admin/parts";
import { StatusPill } from "@/components/ui";
import { link } from "@/components/admin/styles";

export default async function Activity() {
  await requireStaff("view");
  const [logs, donations, apps] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 40, include: { user: { select: { name: true } } } }),
    db.donation.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { donor: { select: { fullName: true } }, project: { select: { code: true } } } }),
    db.application.findMany({ orderBy: { updatedAt: "desc" }, take: 10 }),
  ]);
  const time = (d: Date) => `${date(d)} ${d.toTimeString().slice(0, 5)}`;
  return (
    <div>
      <PageHeader title="Activity feed" intro="What staff and donors have done recently." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Section title="Staff activity" className="xl:col-span-2" actions={<Link className={link} href="/admin/audit">Full audit log</Link>}>
          <ul className="divide-y divide-line text-sm dark:divide-[#24384a]">
            {logs.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 py-2">
                <span><strong>{l.user?.name ?? "System"}</strong> <span className="text-muted">{l.action}</span> {l.detail && <span className="text-muted">— {l.detail.slice(0, 90)}</span>}</span>
                <span className="shrink-0 text-xs text-muted">{time(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Section>
        <div className="space-y-6">
          <Section title="Donations">
            <ul className="space-y-2 text-sm">
              {donations.map((d) => (
                <li key={d.id} className="flex justify-between gap-2">
                  <Link className={link} href={`/admin/donations/${d.id}`}>{d.donor.fullName}</Link>
                  <span className="flex items-center gap-2"><span className="font-num">{usd(d.amountCents)}</span><StatusPill status={d.status} /></span>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Applications">
            <ul className="space-y-2 text-sm">
              {apps.map((a) => (
                <li key={a.id} className="flex justify-between gap-2"><Link className={link} href={`/admin/applications/${a.id}`}>{a.reference}</Link><span className="text-xs text-muted">{a.status.replaceAll("_", " ").toLowerCase()}</span></li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
