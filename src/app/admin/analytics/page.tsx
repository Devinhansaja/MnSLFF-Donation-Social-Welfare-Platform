import { requireStaff } from "@/lib/auth";
import { dashboardData } from "@/lib/admin-stats";
import { lkrRate, parseRange, type SP } from "@/lib/admin-utils";
import { PageHeader } from "@/components/admin/parts";
import { ChartsGrid, RangeBar } from "@/components/admin/dashboard-parts";

export default async function Analytics({ searchParams }: { searchParams: SP }) {
  await requireStaff("view");
  const sp = await searchParams;
  const { from, to, fromStr, toStr } = parseRange(sp);
  const cur = sp.cur === "LKR" ? "LKR" : "USD";
  const [d, rate] = await Promise.all([dashboardData(from, to), lkrRate()]);
  return (
    <div>
      <PageHeader title="Analytics" intro="LKR figures are reporting conversions of USD amounts at the latest recorded exchange rate." actions={<RangeBar fromStr={fromStr} toStr={toStr} cur={cur} base="/admin/analytics" />} />
      <ChartsGrid d={d} money={{ cur, rate }} />
    </div>
  );
}
