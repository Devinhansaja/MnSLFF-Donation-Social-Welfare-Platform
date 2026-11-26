import Link from "next/link";
import { Building2, HeartHandshake } from "lucide-react";
import { db } from "@/lib/db";
import { Container, DemoBadge, EmptyState, PageHero, btn } from "@/components/ui";
import { countryName, flag, usd, cn } from "@/lib/format";

export const metadata = { title: "Our Donors", description: "Thank you to the individuals, companies and organisations who make this work possible." };

export default async function DonorsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const donors = await db.donor.findMany({
    where: {
      publicProfile: true,
      ...(type ? { donorType: type } : {}),
      donations: { some: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] }, anonymous: false, showName: true } },
    },
    include: {
      donations: {
        where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] }, anonymous: false, showName: true },
        select: { amountCents: true, refundedCents: true, project: { select: { title: true, slug: true } } },
      },
    },
    orderBy: { fullName: "asc" },
  });
  const anonymousCount = await db.donation.count({ where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] }, OR: [{ anonymous: true }, { showName: false }] } });

  // Alphabetical, not ranked: no leaderboards without explicit consent.
  const filters: [string, string][] = [["", "All"], ["INDIVIDUAL", "Individuals"], ["CORPORATE", "Corporate"], ["ORGANIZATION", "Organisations"]];

  return (
    <>
      <PageHero eyebrow="Our Donors" title="With gratitude" intro="People and organisations who chose to be recognised publicly. Listed alphabetically — every gift matters equally." image="/images/photos/10-slk-lg.jpg" />
      <Container className="py-14">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {filters.map(([v, l]) => (
              <Link key={v} href={v ? `/donors?type=${v}` : "/donors"} className={cn("rounded-full border px-4 py-2 text-sm font-medium", (type ?? "") === v ? "border-forest bg-forest text-white" : "border-line bg-white hover:border-forest/40")}>{l}</Link>
            ))}
          </div>
          {donors.some((d) => d.isDemo) && <DemoBadge />}
        </div>
        {donors.length === 0 ? <EmptyState title="No public donor profiles yet" /> : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {donors.map((d) => {
              const projects = [...new Map(d.donations.filter((x) => x.project).map((x) => [x.project!.slug, x.project!])).values()];
              const total = d.donations.reduce((s, x) => s + x.amountCents - x.refundedCents, 0);
              const org = d.donorType !== "INDIVIDUAL";
              return (
                <li key={d.id} className="rounded-[var(--radius-card)] border border-line bg-white p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-full bg-forest-50 text-forest">{org ? <Building2 className="size-5" /> : <HeartHandshake className="size-5" />}</span>
                    <div>
                      <p className="font-semibold text-navy">{org ? (d.companyName ?? d.fullName) : d.fullName}</p>
                      <p className="text-xs text-muted">{flag(d.country)} {countryName(d.country)} · {org ? (d.donorType === "CORPORATE" ? "Corporate donor" : "Organisation") : "Individual"}</p>
                    </div>
                  </div>
                  {d.showTotals && (
                    <div className="mt-4 text-sm">
                      <p><span className="text-muted">Total giving: </span><span className="font-num font-semibold">{usd(total)}</span></p>
                      {projects.length > 0 && <p className="mt-1 text-muted">Supported: {projects.map((p, i) => <span key={p.slug}>{i > 0 && ", "}<Link href={`/projects/${p.slug}`} className="text-forest hover:underline">{p.title.replace(" (Demo)", "")}</Link></span>)}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-10 rounded-[var(--radius-card)] border border-line bg-white p-6 text-center text-sm text-muted">
          …and <span className="font-num font-semibold text-navy">{anonymousCount}</span> gifts from donors who chose to remain anonymous. Thank you.
          <Link href="/donate" className={btn("primary", "sm", "ml-3")}>Join them</Link>
        </p>
      </Container>
    </>
  );
}
