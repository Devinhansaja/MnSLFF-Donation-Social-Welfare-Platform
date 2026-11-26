import Link from "next/link";
import { Counter } from "@/components/animated";
import { Container, DemoBadge, PageHero, btn } from "@/components/ui";
import { getPublicProjects, getSiteStats } from "@/lib/queries";
import { db } from "@/lib/db";
import { usd } from "@/lib/format";

export const metadata = { title: "Our Impact", description: "Families, schools and communities supported through verified projects in Sri Lanka." };

export default async function ImpactPage() {
  const [s, projects, categories] = await Promise.all([getSiteStats(), getPublicProjects(), db.category.findMany({ orderBy: { sortOrder: "asc" } })]);
  const byCat = categories
    .map((c) => {
      const ps = projects.filter((p) => p.categoryId === c.id);
      return { name: c.name, projects: ps.length, raised: ps.reduce((t, p) => t + p.finance.gross, 0), people: ps.reduce((t, p) => t + p.directBeneficiaries, 0) };
    })
    .filter((c) => c.projects > 0);
  const districts = [...new Set(projects.map((p) => p.district))];

  return (
    <>
      <PageHero eyebrow="Our Impact" title="Change you can see" intro="Impact figures are summed from verified project records — never estimated or typed by hand." image="/images/photos/13-slk-lg.jpg" />
      <Container className="py-14">
        {projects.some((p) => p.isDemo) && <p className="mb-6 flex items-center gap-2 text-sm text-muted"><DemoBadge /> Currently showing demonstration data.</p>}
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Families supported", s.families], ["Children impacted", s.children], ["Schools supported", s.schools], ["Districts reached", districts.length],
            ["Projects completed", s.completedProjects], ["Active projects", s.activeProjects], ["Donors", s.donors], ["Countries giving", s.countries],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-[var(--radius-card)] border border-line bg-white p-6">
              <dt className="text-sm text-muted">{l}</dt>
              <dd className="mt-2 text-4xl font-bold text-forest"><Counter value={v as number} /></dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-14 font-serif text-3xl text-navy">Impact by cause</h2>
        <div className="mt-6 relative overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-ivory text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-6 py-3">Cause</th><th className="px-3 py-3 text-right">Projects</th><th className="px-3 py-3 text-right">Direct beneficiaries</th><th className="px-6 py-3 text-right">Raised</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {byCat.map((c) => (
                <tr key={c.name}><td className="px-6 py-3 font-medium">{c.name}</td><td className="font-num px-3 py-3 text-right">{c.projects}</td><td className="font-num px-3 py-3 text-right">{c.people.toLocaleString()}</td><td className="font-num px-6 py-3 text-right font-semibold">{usd(c.raised)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-14 font-serif text-3xl text-navy">Where we work</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {districts.map((d) => <Link key={d} href={`/projects?district=${encodeURIComponent(d)}`} className="rounded-full border border-line bg-white px-4 py-2 text-sm hover:border-forest">{d}</Link>)}
        </div>
        <Link href="/completed" className={btn("primary", "md", "mt-10")}>Read completed project reports</Link>
      </Container>
    </>
  );
}
