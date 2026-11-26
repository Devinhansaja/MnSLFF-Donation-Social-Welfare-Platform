import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { usd } from "@/lib/format";
import { type SP } from "@/lib/admin-utils";
import { PageHeader, Section, Empty } from "@/components/admin/parts";
import { link } from "@/components/admin/styles";

export default async function AdminSearch({ searchParams }: { searchParams: SP }) {
  await requireStaff("view");
  const q = ((await searchParams).q ?? "").trim();
  if (!q) return <div><PageHeader title="Search" /><Empty>Type something in the search box above.</Empty></div>;
  const [projects, donations, donors, apps] = await Promise.all([
    db.project.findMany({ where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }, { location: { contains: q, mode: "insensitive" } }] }, take: 10 }),
    db.donation.findMany({ where: { reference: { contains: q, mode: "insensitive" } }, take: 10, include: { donor: true } }),
    db.donor.findMany({ where: { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { companyName: { contains: q, mode: "insensitive" } }] }, take: 10 }),
    db.application.findMany({ where: { OR: [{ reference: { contains: q, mode: "insensitive" } }, { applicantName: { contains: q, mode: "insensitive" } }] }, take: 10 }),
  ]);
  const none = !projects.length && !donations.length && !donors.length && !apps.length;
  return (
    <div className="space-y-4">
      <PageHeader title={`Search: “${q}”`} />
      {none && <Empty>No matches.</Empty>}
      {!!projects.length && <Section title="Projects"><ul className="space-y-1 text-sm">{projects.map((p) => <li key={p.id}><Link className={link} href={`/admin/projects/${p.id}`}>{p.code} {p.title}</Link></li>)}</ul></Section>}
      {!!donations.length && <Section title="Donations"><ul className="space-y-1 text-sm">{donations.map((d) => <li key={d.id}><Link className={link} href={`/admin/donations/${d.id}`}>{d.reference}</Link> — {d.donor.fullName} {usd(d.amountCents)}</li>)}</ul></Section>}
      {!!donors.length && <Section title="Donors"><ul className="space-y-1 text-sm">{donors.map((d) => <li key={d.id}><Link className={link} href={`/admin/donors/${d.id}`}>{d.fullName}</Link> <span className="text-muted">{d.email}</span></li>)}</ul></Section>}
      {!!apps.length && <Section title="Applications"><ul className="space-y-1 text-sm">{apps.map((a) => <li key={a.id}><Link className={link} href={`/admin/applications/${a.id}`}>{a.reference}</Link> — {a.applicantName}</li>)}</ul></Section>}
    </div>
  );
}
