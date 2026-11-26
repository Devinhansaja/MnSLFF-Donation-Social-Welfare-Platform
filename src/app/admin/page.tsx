import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { dashboardData } from "@/lib/admin-stats";
import { lkrRate, money, parseRange, type SP } from "@/lib/admin-utils";
import { num } from "@/lib/format";
import { PageHeader, Section, StatCard } from "@/components/admin/parts";
import { ChartsGrid, RangeBar } from "@/components/admin/dashboard-parts";
import { db } from "@/lib/db";
import { StatusPill } from "@/components/ui";
import { link } from "@/components/admin/styles";

export default async function AdminDashboard({ searchParams }: { searchParams: SP }) {
  await requireStaff("view");
  const sp = await searchParams;
  const { from, to, fromStr, toStr } = parseRange(sp);
  const cur = sp.cur === "LKR" ? "LKR" : "USD";
  const [d, rate, recent] = await Promise.all([
    dashboardData(from, to),
    lkrRate(),
    db.donation.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { donor: true, project: { select: { code: true } } } }),
  ]);
  const m = (c: number) => money(c, cur, rate);
  const s = d.site;

  return (
    <div>
      {sp.denied && (
        <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">You don’t have permission for that page.</p>
      )}
      <PageHeader title="Dashboard" intro="Live figures calculated from confirmed donations and approved expenses." actions={<RangeBar fromStr={fromStr} toStr={toStr} cur={cur} base="/admin" />} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Total required (active projects)" value={m(s.required)} />
        <StatCard label="Gross donations collected" value={m(s.gross)} tone="good" />
        <StatCard label="Net donations collected" value={m(s.net)} />
        <StatCard label="Remaining funding required" value={m(s.remaining)} tone="warn" />
        <StatCard label="Payment processing fees" value={m(s.fees)} />
        <StatCard label="Project expenses (paid)" value={m(s.projectExpenses)} />
        <StatCard label="Administrative expenses" value={m(s.adminExpenses)} />
        <StatCard label="Available fund balance" value={m(s.available)} tone="gold" />
        <StatCard label="Today's donations" value={m(d.today)} />
        <StatCard label="This week" value={m(d.week)} />
        <StatCard label="This month" value={m(d.month)} />
        <StatCard label="This year" value={m(d.year)} />
        <StatCard label="Selected range (gross)" value={m(d.rangeGross)} sub={`${fromStr} → ${toStr}`} />
        <StatCard label="Total donors" value={num(d.donorsTotal)} />
        <StatCard label="International donors" value={num(d.intl)} />
        <StatCard label="Local donors (LK)" value={num(d.local)} />
        <StatCard label="Active projects" value={num(d.counts.active)} />
        <StatCard label="Urgent projects" value={num(d.counts.urgent)} tone={d.counts.urgent ? "bad" : undefined} />
        <StatCard label="Fully funded projects" value={num(d.counts.fullyFunded)} />
        <StatCard label="Completed projects" value={num(d.counts.completed)} />
        <StatCard label="Pending verification" value={num(d.counts.pendingVerification)} />
        <StatCard label="Pending payments" value={num(d.counts.pendingPayments)} tone={d.counts.pendingPayments ? "warn" : undefined} />
        <StatCard label="Pending applications" value={num(d.counts.pendingApps)} />
        <StatCard label="Expense commitments" value={m(d.commitments)} sub="Approved, not yet paid" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartsGrid d={d} money={{ cur, rate }} />
        </div>
        <Section title="Latest donation activity" actions={<Link href="/admin/donations" className={link}>All</Link>}>
          <ul className="divide-y divide-line text-sm dark:divide-[#24384a]">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <Link href={`/admin/donations/${r.id}`} className={link}>{r.reference}</Link>
                  <p className="truncate text-xs text-muted">{r.donor.fullName} · {r.project?.code ?? "General fund"}</p>
                </div>
                <div className="text-right">
                  <p className="font-num font-semibold">{m(r.amountCents)}</p>
                  <StatusPill status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
