import { Download, ShieldCheck } from "lucide-react";
import { Container, DemoBadge, PageHero, btn } from "@/components/ui";
import { AllocationDonut, RequiredVsCollected } from "@/components/transparency-charts";
import { getPublicProjects, getSiteStats } from "@/lib/queries";
import { usd } from "@/lib/format";

export const metadata = { title: "Financial Transparency", description: "Public financial dashboard: donations, fees, refunds, expenses and balances in USD." };

export default async function TransparencyPage() {
  const [s, projects] = await Promise.all([getSiteStats(), getPublicProjects()]);
  const hasDemo = projects.some((p) => p.isDemo);
  const cards: [string, number, string][] = [
    ["Gross donations received", s.grossReceived, "All confirmed payments before refunds."],
    ["Payment processing fees", s.fees, "Charged by card and payment providers."],
    ["Refunds & reversals", s.refunds, "Returned to donors under our refund policy."],
    ["Net donations received", s.net, "Gross received minus refunds and fees."],
    ["Project expenses (paid)", s.projectExpenses, "Approved and paid project spending."],
    ["Administrative expenses", s.adminExpenses, "Hosting, bank charges, verification travel."],
    ["Outstanding commitments", s.commitments, "Approved but not yet paid."],
    ["Available fund balance", s.available, "Net received minus all paid expenses."],
    ["Remaining project requirements", s.remaining, "Still needed across active projects."],
  ];

  return (
    <>
      <PageHero eyebrow="Financial Transparency" title="Every dollar, accounted for" intro="These figures are calculated live from the same ledger our finance team uses. Nothing is typed in by hand." image="/images/photos/03-slk-lg.jpg" />
      <Container className="py-14">
        {hasDemo && <p className="mb-6 flex items-center gap-2 rounded-xl border border-dashed border-gold bg-gold-soft/50 p-3 text-sm text-forest-deep"><DemoBadge /> The figures below come from demonstration records and are not real financial results.</p>}
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([l, v, hint]) => (
            <div key={l} className="rounded-[var(--radius-card)] border border-line bg-white p-6">
              <dt className="text-sm font-medium text-muted">{l}</dt>
              <dd className="font-num mt-2 text-3xl font-bold text-navy">{usd(v)}</dd>
              <p className="mt-1 text-xs text-muted">{hint}</p>
            </div>
          ))}
        </dl>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-[var(--radius-card)] border border-line bg-white p-6">
            <h2 className="font-serif text-2xl text-navy">Where net donations are</h2>
            <div className="mt-6">
              <AllocationDonut data={[
                { name: "Spent on projects", value: s.projectExpenses },
                { name: "Administration", value: s.adminExpenses },
                { name: "Held for active projects", value: Math.max(0, s.available) },
              ]} />
            </div>
          </section>
          <section className="rounded-[var(--radius-card)] border border-line bg-white p-6">
            <h2 className="font-serif text-2xl text-navy">Required vs collected</h2>
            <div className="mt-6">
              <RequiredVsCollected data={projects.map((p) => ({ name: p.title.replace(/ — .*$/, "").replace(" (Demo)", "").slice(0, 26), required: p.goalCents, collected: p.finance.gross }))} />
            </div>
          </section>
        </div>

        <section className="mt-10 relative overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white">
          <h2 className="p-6 pb-0 font-serif text-2xl text-navy">Project-by-project</h2>
          <table className="mt-4 w-full min-w-[880px] text-sm">
            <thead className="bg-ivory text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-6 py-3">Project</th><th className="px-3 py-3 text-right">Goal</th><th className="px-3 py-3 text-right">Gross</th><th className="px-3 py-3 text-right">Fees</th>
                <th className="px-3 py-3 text-right">Net</th><th className="px-3 py-3 text-right">Spent</th><th className="px-3 py-3 text-right">Balance</th><th className="px-6 py-3 text-right">Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-3"><a href={`/projects/${p.slug}`} className="font-medium text-navy hover:text-forest">{p.title}</a><span className="block font-mono text-xs text-muted">{p.code}</span></td>
                  {[p.goalCents, p.finance.gross, p.finance.fees, p.finance.net, p.finance.expensesPaid, p.finance.available].map((v, i) => <td key={i} className="font-num px-3 py-3 text-right">{usd(v)}</td>)}
                  <td className="font-num px-6 py-3 text-right font-semibold">{usd(p.finance.remainingGross)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section id="reports" className="mt-10 scroll-mt-24 rounded-[var(--radius-card)] border border-line bg-white p-6">
          <h2 className="font-serif text-2xl text-navy">Downloadable reports</h2>
          <p className="mt-1 text-sm text-muted">Public summaries in USD. Donor-level data is never included.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a download href="/api/public-reports/projects?format=csv" className={btn("outline")}><Download className="size-4" /> Project summary (CSV)</a>
            <a download href="/api/public-reports/projects?format=pdf" className={btn("outline")}><Download className="size-4" /> Project summary (PDF)</a>
            <a download href="/api/public-reports/expenses?format=csv" className={btn("outline")}><Download className="size-4" /> Public expenses (CSV)</a>
          </div>
          <p className="mt-6 flex items-start gap-2 text-xs text-muted"><ShieldCheck className="mt-0.5 size-4 text-forest" /> Confirmed donation totals can only change through verified payments, approved refunds, or documented adjustments approved by two finance officers. Every change is written to an append-only ledger.</p>
        </section>
      </Container>
    </>
  );
}
