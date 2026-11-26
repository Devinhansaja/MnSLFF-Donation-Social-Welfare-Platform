import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjects, STATUS_LABELS } from "@/lib/queries";
import { usd, num, date } from "@/lib/format";
import { type SP } from "@/lib/admin-utils";
import { PageHeader, Filters, Select, TextFilter, Empty } from "@/components/admin/parts";
import { btn, StatusPill, DemoBadge } from "@/components/ui";
import { link, table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function ProjectsAdmin({ searchParams }: { searchParams: SP }) {
  await requireStaff("view");
  const sp = await searchParams;
  const where: Prisma.ProjectWhereInput = {
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.priority ? { priority: sp.priority } : {}),
    ...(sp.category ? { categoryId: sp.category } : {}),
    ...(sp.verification ? { verificationStatus: sp.verification } : {}),
    ...(sp.q ? { OR: [{ title: { contains: sp.q } }, { code: { contains: sp.q } }, { location: { contains: sp.q } }] } : {}),
  };
  const [projects, categories] = await Promise.all([
    getProjects(where, [{ createdAt: "desc" }]),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const heading = sp.priority === "URGENT" ? "Urgent projects" : sp.verification === "PENDING" ? "Project verification" : sp.status ? `${STATUS_LABELS[sp.status] ?? sp.status} projects` : "All projects";

  return (
    <div>
      <PageHeader title={heading} intro="Fundraising figures are calculated live from confirmed donations." actions={<Link href="/admin/projects/new" className={btn("primary", "sm")}><Plus className="size-4" /> Add project</Link>} />
      <Filters action="/admin/projects">
        <TextFilter name="q" label="Search" value={sp.q} placeholder="Title, ID, location" />
        <Select name="status" label="Status" value={sp.status} options={Object.entries(STATUS_LABELS)} />
        <Select name="category" label="Category" value={sp.category} options={categories.map((c) => [c.id, c.name])} />
        <Select name="priority" label="Priority" value={sp.priority} options={[["NORMAL", "Normal"], ["HIGH", "High"], ["URGENT", "Urgent"]]} />
        <Select name="verification" label="Verification" value={sp.verification} options={[["PENDING", "Pending"], ["VERIFIED", "Verified"], ["REJECTED", "Rejected"]]} />
      </Filters>
      {projects.length === 0 ? (
        <Empty>No projects match these filters.</Empty>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>Project</th><th className={th}>Status</th><th className={th}>Verification</th>
                <th className={`${th} text-right`}>Goal</th><th className={`${th} text-right`}>Gross</th><th className={`${th} text-right`}>Remaining</th>
                <th className={`${th} text-right`}>%</th><th className={`${th} text-right`}>Donors</th><th className={th}>Deadline</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-ivory/60 dark:hover:bg-white/5">
                  <td className={td}>
                    <Link href={`/admin/projects/${p.id}`} className={link}>{p.title}</Link>
                    <p className="text-xs text-muted">{p.code} · {p.category.name} · {p.district} {p.priority === "URGENT" && <span className="font-semibold text-urgent">· URGENT</span>} {p.featured && "· ★ featured"}</p>
                    {p.isDemo && <DemoBadge className="mt-1" />}
                  </td>
                  <td className={td}><StatusPill status={p.status} label={STATUS_LABELS[p.status]} /></td>
                  <td className={td}><StatusPill status={p.verificationStatus === "VERIFIED" ? "PAID" : p.verificationStatus === "REJECTED" ? "FAILED" : "PENDING"} label={p.verificationStatus.toLowerCase()} /></td>
                  <td className={`${td} font-num text-right`}>{usd(p.finance.goal)}</td>
                  <td className={`${td} font-num text-right`}>{usd(p.finance.gross)}</td>
                  <td className={`${td} font-num text-right`}>{usd(p.finance.remainingGross)}</td>
                  <td className={`${td} font-num text-right`}>{p.finance.percent}%</td>
                  <td className={`${td} font-num text-right`}>{num(p.donorCount)}</td>
                  <td className={td}>{date(p.deadline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
