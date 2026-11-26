import "server-only";
import { db } from "./db";
import { CONFIRMED_STATUSES, donationGross, sumDonations, sumExpenses } from "./finance";
import { getProjects, getSiteStats } from "./queries";
import { countryName } from "./format";

function startOf(unit: "day" | "week" | "month" | "year") {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (unit === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  if (unit === "month") d.setDate(1);
  if (unit === "year") { d.setMonth(0); d.setDate(1); }
  return d;
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short", year: "2-digit" });
};

export async function dashboardData(from: Date, to: Date) {
  const [site, donations, projects, expenses, pendingPayments, pendingApps, allDonorFirst] = await Promise.all([
    getSiteStats(),
    db.donation.findMany({
      where: { status: { in: [...CONFIRMED_STATUSES] } },
      select: {
        amountCents: true, feeCents: true, refundedCents: true, status: true, confirmedAt: true, createdAt: true, method: true, donorId: true,
        donor: { select: { country: true } }, project: { select: { category: { select: { name: true } } } },
      },
    }),
    getProjects({}),
    db.expense.findMany({ where: { status: { in: ["APPROVED", "PAID"] } }, select: { amountCents: true, status: true, category: true, administrative: true, date: true } }),
    db.donation.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
    db.application.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "VERIFICATION_ASSIGNED", "FIELD_VERIFICATION"] } } }),
    db.donation.groupBy({ by: ["donorId"], where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] } }, _min: { confirmedAt: true } }),
  ]);

  const when = (d: { confirmedAt: Date | null; createdAt: Date }) => d.confirmedAt ?? d.createdAt;
  const since = (start: Date) => sumDonations(donations.filter((d) => when(d) >= start)).gross;
  const inRange = donations.filter((d) => when(d) >= from && when(d) <= to);

  const donorCountries = new Map<string, string>();
  for (const d of donations) if (d.status !== "CHARGEBACK" && d.status !== "REFUNDED") donorCountries.set(d.donorId, d.donor.country);
  const intl = [...donorCountries.values()].filter((c) => c !== "LK").length;

  const nonDemoStatuses = (s: string) => projects.filter((p) => p.status === s).length;

  // Monthly revenue within range
  const months: string[] = [];
  for (let d = new Date(from.getFullYear(), from.getMonth(), 1); d <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(monthKey(d));
  const monthly = months.map((k) => {
    const rows = inRange.filter((d) => monthKey(when(d)) === k);
    const t = sumDonations(rows);
    return { name: monthLabel(k), gross: t.gross, net: t.net };
  });

  const groupSum = (key: (d: (typeof inRange)[number]) => string) => {
    const m = new Map<string, number>();
    for (const d of inRange) m.set(key(d), (m.get(key(d)) ?? 0) + donationGross(d));
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };
  const byCategory = groupSum((d) => d.project?.category.name ?? "General fund");
  const byCountry = groupSum((d) => countryName(d.donor.country)).slice(0, 10);
  const byMethod = groupSum((d) => d.method.replaceAll("_", " "));

  const requiredVsCollected = projects
    .filter((p) => p.status !== "DRAFT" && p.status !== "CANCELLED")
    .map((p) => ({ name: p.code, title: p.title, required: p.goalCents, collected: p.finance.gross }));

  const expMap = new Map<string, number>();
  for (const e of expenses) expMap.set(e.category, (expMap.get(e.category) ?? 0) + e.amountCents);
  const expenseDistribution = [...expMap.entries()].map(([name, value]) => ({ name, value }));

  // Donor growth: cumulative donors by month of first confirmed gift
  const firstMonths = allDonorFirst.map((g) => (g._min.confirmedAt ? monthKey(g._min.confirmedAt) : null)).filter(Boolean) as string[];
  const donorGrowth = months.map((k) => ({ name: monthLabel(k), donors: firstMonths.filter((m) => m <= k).length }));

  // Daily transactions last 30 days
  const daily = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (29 - i));
    const next = new Date(d.getTime() + 86400000);
    const rows = donations.filter((x) => when(x) >= d && when(x) < next);
    return { name: `${d.getMonth() + 1}/${d.getDate()}`, count: rows.length, amount: sumDonations(rows).gross };
  });

  // Fund allocation: net funds by destination
  const generalNet = sumDonations(donations.filter((d) => !d.project)).net;
  const fundAllocation = [
    ...projects.filter((p) => p.finance.net > 0).map((p) => ({ name: p.code, value: p.finance.net })),
    ...(generalNet > 0 ? [{ name: "General fund", value: generalNet }] : []),
  ];

  const completedTrend = months.map((k) => ({
    name: monthLabel(k),
    completed: projects.filter((p) => p.completedAt && monthKey(p.completedAt) === k).length,
  }));

  const exp = sumExpenses(expenses);

  return {
    site,
    rangeGross: sumDonations(inRange).gross,
    today: since(startOf("day")),
    week: since(startOf("week")),
    month: since(startOf("month")),
    year: since(startOf("year")),
    donorsTotal: donorCountries.size,
    intl,
    local: donorCountries.size - intl,
    counts: {
      active: projects.filter((p) => ["FUNDRAISING", "FULLY_FUNDED", "IN_PROGRESS"].includes(p.status)).length,
      urgent: projects.filter((p) => p.priority === "URGENT" && p.status === "FUNDRAISING").length,
      fullyFunded: nonDemoStatuses("FULLY_FUNDED"),
      completed: nonDemoStatuses("COMPLETED"),
      pendingVerification: projects.filter((p) => p.verificationStatus === "PENDING" || p.status === "PENDING_VERIFICATION").length,
      pendingPayments,
      pendingApps,
    },
    commitments: exp.committed,
    charts: { monthly, byCategory, byCountry, byMethod, requiredVsCollected, expenseDistribution, donorGrowth, daily, fundAllocation, completedTrend },
  };
}

export type DashboardData = Awaited<ReturnType<typeof dashboardData>>;
