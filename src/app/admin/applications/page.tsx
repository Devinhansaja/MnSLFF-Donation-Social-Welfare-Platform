import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, usd } from "@/lib/format";
import { type SP } from "@/lib/admin-utils";
import { PageHeader, Filters, Select, TextFilter, Empty } from "@/components/admin/parts";
import { StatusPill } from "@/components/ui";
import { link, table, tableWrap, tbody, td, th } from "@/components/admin/styles";

const APP_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "VERIFICATION_ASSIGNED", "FIELD_VERIFICATION", "APPROVED", "REJECTED", "PROJECT_CREATED", "FUNDRAISING_STARTED"];

export default async function Applications({ searchParams }: { searchParams: SP }) {
  await requireStaff("view");
  const sp = await searchParams;
  const where: Prisma.ApplicationWhereInput = {
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.category ? { category: sp.category } : {}),
    ...(sp.q ? { OR: [{ reference: { contains: sp.q } }, { applicantName: { contains: sp.q } }, { location: { contains: sp.q } }] } : {}),
  };
  const [rows, counts] = await Promise.all([
    db.application.findMany({ where, orderBy: { createdAt: "desc" } }),
    db.application.groupBy({ by: ["status"], _count: true }),
  ]);
  return (
    <div>
      <PageHeader title="Assistance applications" intro="Submitted → Under Review → Verification Assigned → Field Verification → Approved/Rejected → Project Created → Fundraising Started." />
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {APP_STATUSES.map((s) => (
          <Link key={s} href={`/admin/applications?status=${s}`} className="rounded-full border border-line bg-white px-3 py-1 hover:border-forest dark:border-[#24384a] dark:bg-transparent">
            {s.replaceAll("_", " ").toLowerCase()} <strong>{counts.find((c) => c.status === s)?._count ?? 0}</strong>
          </Link>
        ))}
      </div>
      <Filters action="/admin/applications">
        <TextFilter name="q" label="Search" value={sp.q} placeholder="Reference, name, location" />
        <Select name="status" label="Status" value={sp.status} options={APP_STATUSES.map((s) => [s, s.replaceAll("_", " ").toLowerCase()])} />
        <Select name="category" label="Category" value={sp.category} options={["FAMILY", "SCHOOL", "EDUCATION", "MEDICAL", "HOUSING", "EMERGENCY", "OTHER"].map((c) => [c, c.toLowerCase()])} />
      </Filters>
      {!rows.length ? <Empty>No applications.</Empty> : (
        <div className={tableWrap}>
          <table className={table}>
            <thead><tr><th className={th}>Reference</th><th className={th}>Applicant</th><th className={th}>Category</th><th className={th}>Location</th><th className={`${th} text-right`}>Estimate</th><th className={`${th} text-right`}>Beneficiaries</th><th className={th}>Officer</th><th className={th}>Status</th><th className={th}>Received</th></tr></thead>
            <tbody className={tbody}>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className={td}><Link className={`${link} font-mono text-xs`} href={`/admin/applications/${a.id}`}>{a.reference}</Link></td>
                  <td className={td}>{a.applicantName}</td>
                  <td className={td}>{a.category.toLowerCase()}</td>
                  <td className={td}>{a.location}</td>
                  <td className={`${td} font-num text-right`}>{usd(a.estimatedCents)}</td>
                  <td className={`${td} font-num text-right`}>{a.beneficiaries}</td>
                  <td className={td}>{a.officer || "—"}</td>
                  <td className={td}><StatusPill status={a.status === "REJECTED" ? "FAILED" : a.status === "APPROVED" || a.status.startsWith("PROJECT") || a.status.startsWith("FUND") ? "PAID" : "PENDING"} label={a.status.replaceAll("_", " ").toLowerCase()} /></td>
                  <td className={td}>{date(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
