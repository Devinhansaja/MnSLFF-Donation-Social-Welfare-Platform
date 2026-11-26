import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, flag, usd } from "@/lib/format";
import { pageOf, PAGE_SIZE, type SP } from "@/lib/admin-utils";
import { sumDonations } from "@/lib/finance";
import { PageHeader, Filters, Select, TextFilter, Pagination, Empty, StatCard } from "@/components/admin/parts";
import { btn, StatusPill, DemoBadge } from "@/components/ui";
import { link, table, tableWrap, tbody, td, th } from "@/components/admin/styles";

const STATUSES = ["INITIATED", "PENDING", "PROCESSING", "PAID", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED", "CHARGEBACK"];

export default async function DonationsAdmin({ searchParams }: { searchParams: SP }) {
  await requireStaff("view");
  const sp = await searchParams;
  const { page, skip, take } = pageOf(sp);
  const where: Prisma.DonationWhereInput = {
    ...(sp.status === "REFUNDED" ? { status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } } : sp.status ? { status: sp.status } : {}),
    ...(sp.method ? { method: sp.method } : {}),
    ...(sp.project === "general" ? { projectId: null } : sp.project ? { projectId: sp.project } : {}),
    ...(sp.frequency ? { frequency: sp.frequency } : {}),
    ...(sp.kind ? { kind: sp.kind } : {}),
    ...(sp.anonymous ? { anonymous: true } : {}),
    ...(sp.from || sp.to ? { createdAt: { ...(sp.from ? { gte: new Date(`${sp.from}T00:00:00`) } : {}), ...(sp.to ? { lte: new Date(`${sp.to}T23:59:59`) } : {}) } } : {}),
    ...(sp.q ? { OR: [{ reference: { contains: sp.q, mode: "insensitive" } }, { donor: { fullName: { contains: sp.q, mode: "insensitive" } } }, { donor: { email: { contains: sp.q, mode: "insensitive" } } }] } : {}),
  };
  const [rows, total, agg, projects, methods] = await Promise.all([
    db.donation.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { donor: true, project: { select: { code: true, title: true } }, budgetItem: { select: { name: true } } } }),
    db.donation.count({ where }),
    db.donation.findMany({ where, select: { amountCents: true, feeCents: true, refundedCents: true, status: true } }),
    db.project.findMany({ select: { id: true, code: true, title: true }, orderBy: { code: "asc" } }),
    db.donation.findMany({ distinct: ["method"], select: { method: true } }),
  ]);
  const t = sumDonations(agg);
  const title =
    sp.frequency === "MONTHLY" ? "Recurring donations" : sp.kind === "ITEM" ? "Item sponsorships" : sp.anonymous ? "Anonymous donations"
      : sp.status === "PAID" ? "Confirmed donations" : sp.status === "PENDING" ? "Pending donations" : sp.status === "FAILED" ? "Failed donations" : sp.status === "REFUNDED" ? "Refunded donations" : "All donations";

  return (
    <div>
      <PageHeader title={title} intro="Only PAID donations (net of refunds) count towards project totals." actions={<Link href="/admin/donations/new" className={btn("primary", "sm")}><Plus className="size-4" /> Manual donation</Link>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Records" value={total} />
        <StatCard label="Confirmed gross (filtered)" value={usd(t.gross)} tone="good" />
        <StatCard label="Fees (filtered)" value={usd(t.fees)} />
        <StatCard label="Refunded (filtered)" value={usd(t.refunds)} />
      </div>
      <Filters action="/admin/donations">
        <TextFilter name="q" label="Search" value={sp.q} placeholder="Reference, donor name or email" />
        <Select name="status" label="Status" value={sp.status} options={STATUSES.map((s) => [s, s.replaceAll("_", " ").toLowerCase()])} />
        <Select name="method" label="Method" value={sp.method} options={methods.map((m) => [m.method, m.method.replaceAll("_", " ")])} />
        <Select name="project" label="Project" value={sp.project} options={[["general", "General fund"], ...projects.map((p) => [p.id, `${p.code} ${p.title.slice(0, 30)}`] as [string, string])]} />
        <Select name="kind" label="Type" value={sp.kind} options={[["GENERAL", "General"], ["PROJECT", "Project"], ["ITEM", "Item"], ["CORPORATE", "Corporate"], ["FAMILY", "Family"], ["STUDENT", "Student"]]} />
        <TextFilter name="from" label="From" type="date" value={sp.from} />
        <TextFilter name="to" label="To" type="date" value={sp.to} />
        {sp.frequency && <input type="hidden" name="frequency" value={sp.frequency} />}
        {sp.anonymous && <input type="hidden" name="anonymous" value="1" />}
      </Filters>
      {rows.length === 0 ? (
        <Empty>{sp.frequency === "MONTHLY" ? "No recurring donations yet. Monthly giving starts when a recurring-capable gateway is activated." : "No donations match these filters."}</Empty>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead><tr>
              <th className={th}>Reference</th><th className={th}>Donor</th><th className={th}>Destination</th><th className={th}>Method</th>
              <th className={`${th} text-right`}>Amount</th><th className={`${th} text-right`}>Fee</th><th className={th}>Status</th><th className={th}>Date</th>
            </tr></thead>
            <tbody className={tbody}>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-ivory/60 dark:hover:bg-white/5">
                  <td className={td}><Link href={`/admin/donations/${r.id}`} className={`${link} font-mono text-xs`}>{r.reference}</Link>{r.isDemo && <DemoBadge className="ml-1" />}</td>
                  <td className={td}>{flag(r.donor.country)} {r.donor.fullName}{r.anonymous && <span className="ml-1 text-xs text-muted">(anonymous)</span>}<p className="text-xs text-muted">{r.donor.email}</p></td>
                  <td className={td}>{r.project?.code ?? "General fund"}{r.budgetItem && <p className="text-xs text-muted">{r.itemQuantity} × {r.budgetItem.name}</p>}</td>
                  <td className={td}>{r.method.replaceAll("_", " ")}{r.frequency === "MONTHLY" && <p className="text-xs text-muted">monthly</p>}</td>
                  <td className={`${td} font-num text-right`}>{usd(r.amountCents)}{r.originalCurrency !== "USD" && <p className="text-xs text-muted">{r.originalCurrency} {(r.originalAmount / 100).toLocaleString()}</p>}</td>
                  <td className={`${td} font-num text-right`}>{usd(r.feeCents)}</td>
                  <td className={td}><StatusPill status={r.status} /></td>
                  <td className={td}>{date(r.confirmedAt ?? r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} size={PAGE_SIZE} sp={sp} base="/admin/donations" />
    </div>
  );
}
