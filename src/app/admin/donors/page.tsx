import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { sumDonations } from "@/lib/finance";
import { countryName, date, flag, usd } from "@/lib/format";
import { pageOf, PAGE_SIZE, type SP } from "@/lib/admin-utils";
import { PageHeader, Filters, Select, TextFilter, Pagination, Empty } from "@/components/admin/parts";
import { DemoBadge } from "@/components/ui";
import { link, table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function DonorsAdmin({ searchParams }: { searchParams: SP }) {
  await requireStaff("view");
  const sp = await searchParams;
  const { page, skip, take } = pageOf(sp);
  const where: Prisma.DonorWhereInput = {
    ...(sp.type ? { donorType: sp.type } : {}),
    ...(sp.intl ? { country: { not: "LK" } } : {}),
    ...(sp.country ? { country: sp.country } : {}),
    ...(sp.public ? { publicProfile: true } : {}),
    ...(sp.q ? { OR: [{ fullName: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { companyName: { contains: sp.q, mode: "insensitive" } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    db.donor.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { donations: { select: { amountCents: true, feeCents: true, refundedCents: true, status: true, projectId: true, confirmedAt: true } } } }),
    db.donor.count({ where }),
  ]);
  const title = sp.type === "CORPORATE" ? "Corporate donors" : sp.type === "INDIVIDUAL" ? "Individual donors" : sp.intl ? "International donors" : sp.public ? "Donor directory (public profiles)" : "All donors";
  return (
    <div>
      <PageHeader title={title} intro="Contact details are private and never shown on the public site." />
      <Filters action="/admin/donors">
        <TextFilter name="q" label="Search" value={sp.q} placeholder="Name, email, company" />
        <Select name="type" label="Type" value={sp.type} options={[["INDIVIDUAL", "Individual"], ["CORPORATE", "Corporate"], ["ORGANIZATION", "Organization"]]} />
        <Select name="intl" label="Location" value={sp.intl} options={[["1", "International (outside LK)"]]} />
        <Select name="public" label="Directory" value={sp.public} options={[["1", "Public profile only"]]} />
      </Filters>
      {!rows.length ? <Empty>No donors found.</Empty> : (
        <div className={tableWrap}>
          <table className={table}>
            <thead><tr><th className={th}>Donor</th><th className={th}>Type</th><th className={th}>Country</th><th className={`${th} text-right`}>Lifetime gross</th><th className={`${th} text-right`}>Gifts</th><th className={`${th} text-right`}>Projects</th><th className={th}>Last gift</th><th className={th}>Public</th></tr></thead>
            <tbody className={tbody}>
              {rows.map((d) => {
                const t = sumDonations(d.donations);
                const last = d.donations.map((x) => x.confirmedAt).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0];
                return (
                  <tr key={d.id}>
                    <td className={td}><Link href={`/admin/donors/${d.id}`} className={link}>{d.fullName}</Link>{d.companyName && <p className="text-xs text-muted">{d.companyName}</p>}<p className="text-xs text-muted">{d.email}</p>{d.isDemo && <DemoBadge />}</td>
                    <td className={td}>{d.donorType.toLowerCase()}</td>
                    <td className={td}>{flag(d.country)} {countryName(d.country)}</td>
                    <td className={`${td} font-num text-right`}>{usd(t.gross)}</td>
                    <td className={`${td} font-num text-right`}>{t.count}</td>
                    <td className={`${td} font-num text-right`}>{new Set(d.donations.filter((x) => x.projectId).map((x) => x.projectId)).size}</td>
                    <td className={td}>{date(last)}</td>
                    <td className={td}>{d.publicProfile ? "Listed" : "Private"}{d.showTotals && " · totals"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} size={PAGE_SIZE} sp={sp} base="/admin/donors" />
    </div>
  );
}
