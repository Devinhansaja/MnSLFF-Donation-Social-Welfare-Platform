import Link from "next/link";
import type { DashboardData } from "@/lib/admin-stats";
import { CountBars, CountLine, MoneyArea, MoneyBars, MoneyPie } from "./charts";
import { Section } from "./parts";
import { cn } from "@/lib/format";

export function RangeBar({ fromStr, toStr, cur, base }: { fromStr: string; toStr: string; cur: string; base: string }) {
  return (
    <form method="get" action={base} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="from" className="label">From</label>
        <input id="from" type="date" name="from" defaultValue={fromStr} className="field h-9 !py-1 text-sm" />
      </div>
      <div>
        <label htmlFor="to" className="label">To</label>
        <input id="to" type="date" name="to" defaultValue={toStr} className="field h-9 !py-1 text-sm" />
      </div>
      <div>
        <label htmlFor="cur" className="label">Currency</label>
        <select id="cur" name="cur" defaultValue={cur} className="field h-9 !py-1 text-sm">
          <option value="USD">USD</option>
          <option value="LKR">LKR</option>
        </select>
      </div>
      <button className="h-9 rounded-full bg-forest px-4 text-sm font-semibold text-white">Apply</button>
      <Link href={base} className={cn("h-9 px-2 text-sm leading-9 text-muted hover:text-forest")}>Reset</Link>
    </form>
  );
}

export function ChartsGrid({ d, money }: { d: DashboardData; money: { cur: "USD" | "LKR"; rate: number } }) {
  const c = d.charts;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Section title="Monthly donation revenue" className="xl:col-span-2">
        <MoneyArea data={c.monthly} keys={[{ key: "gross", label: "Gross" }, { key: "net", label: "Net of fees" }]} money={money} />
      </Section>
      <Section title="Donations by project category"><MoneyPie data={c.byCategory} money={money} /></Section>
      <Section title="Donations by country"><MoneyBars data={c.byCountry} keys={[{ key: "value", label: "Gross" }]} money={money} horizontal /></Section>
      <Section title="Donations by payment method"><MoneyPie data={c.byMethod} money={money} /></Section>
      <Section title="Fund allocation (net funds by destination)"><MoneyPie data={c.fundAllocation} money={money} /></Section>
      <Section title="Required vs collected funding" className="xl:col-span-2">
        <MoneyBars data={c.requiredVsCollected} keys={[{ key: "required", label: "Required" }, { key: "collected", label: "Collected" }]} money={money} />
      </Section>
      <Section title="Project expense distribution"><MoneyPie data={c.expenseDistribution} money={money} /></Section>
      <Section title="Donor growth (cumulative)"><CountLine data={c.donorGrowth} keys={[{ key: "donors", label: "Donors" }]} /></Section>
      <Section title="Daily transactions (last 30 days)"><CountBars data={c.daily} k="count" label="Confirmed donations" /></Section>
      <Section title="Project completion trend"><CountBars data={c.completedTrend} k="completed" label="Projects completed" /></Section>
    </div>
  );
}
