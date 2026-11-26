import Link from "next/link";
import {
  ArrowRight, BadgeCheck, CreditCard, Eye, HandHeart, Heart, LineChart, Quote, ShieldCheck, Sparkles,
} from "lucide-react";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { Counter, Reveal } from "@/components/animated";
import { ProjectCard } from "@/components/project-card";
import { ButtonLink, Container, DemoBadge, SectionHeading, btn } from "@/components/ui";
import { AllocationDonut } from "@/components/transparency-charts";
import { getT } from "@/lib/i18n";
import { getPublicDonations, getPublicProjects, getSettings, getSiteStats } from "@/lib/queries";
import { db } from "@/lib/db";
import { date, flag, countryName, num, usd } from "@/lib/format";

export default async function HomePage() {
  const [{ t, lang }, settings, stats, projects, categories, recent, testimonials] = await Promise.all([
    getT(),
    getSettings(),
    getSiteStats(),
    getPublicProjects(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getPublicDonations({ take: 8 }),
    db.testimonial.findMany({ where: { approved: true, consent: true }, take: 4 }),
  ]);

  // Fall back to the bundled photos so the hero is never blank (e.g. a fresh, empty database).
  let heroImages: string[] = [];
  try { heroImages = JSON.parse(settings.heroImages || "[]"); } catch {}
  if (heroImages.length === 0) heroImages = ["13-slk-lg.jpg", "04-slk-lg.jpg", "11-slk-lg.jpg", "05-slk-lg.jpg"].map((f) => `/images/photos/${f}`);
  const fundraising = projects.filter((p) => p.status === "FUNDRAISING");
  const urgent = fundraising.filter((p) => p.priority === "URGENT" || p.priority === "HIGH").sort((a, b) => (a.priority === "URGENT" ? -1 : 1) - (b.priority === "URGENT" ? -1 : 1)).slice(0, 3);
  const featured = projects.filter((p) => p.featured && p.status !== "COMPLETED").slice(0, 6);
  const completed = projects.filter((p) => p.status === "COMPLETED").slice(0, 2);
  const hasDemo = projects.some((p) => p.isDemo);

  const catStats = categories.map((c) => {
    const ps = projects.filter((p) => p.categoryId === c.id && p.status === "FUNDRAISING");
    return { ...c, active: ps.length, remaining: ps.reduce((s, p) => s + p.finance.remainingGross, 0) };
  });

  const statItems: { label: string; value: number; usd?: boolean }[] = [
    { label: "Total donations raised", value: stats.gross, usd: true },
    { label: "Total funding required", value: stats.required, usd: true },
    { label: "Remaining funding required", value: stats.remaining, usd: true },
    { label: "Total donors", value: stats.donors },
    { label: "Active projects", value: stats.activeProjects },
    { label: "Completed projects", value: stats.completedProjects },
    { label: "Families supported", value: stats.families },
    { label: "Schools supported", value: stats.schools },
    { label: "Children impacted", value: stats.children },
    { label: "Countries supporting us", value: stats.countries },
  ];

  return (
    <>
      {/* 01 — Hero */}
      <section className="relative isolate -mt-18 flex min-h-[92svh] items-end overflow-hidden text-white">
        <HeroSlideshow images={heroImages} />
        <Container className="pb-20 pt-36 sm:pb-28">
          <div className="max-w-3xl animate-fade-up">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur">
              <ShieldCheck className="size-4 text-gold" aria-hidden /> {t("trust")}
            </p>
            <h1 className="font-serif text-5xl leading-[1.04] sm:text-6xl lg:text-7xl">{(lang === "en" && settings.home_hero_title) || t("heroTitle")}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl">{(lang === "en" && settings.home_hero_subtitle) || t("heroSubtitle")}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/projects" variant="gold" size="lg">
                {t("exploreProjects")} <ArrowRight className="size-5" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/donate" variant="ghostLight" size="lg">
                <Heart className="size-5" aria-hidden /> {t("donateNow")}
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* 02 — Live impact statistics */}
      <section aria-labelledby="impact-heading" className="relative z-10 -mt-10">
        <Container>
          <div className="rounded-[1.75rem] border border-line bg-white p-6 shadow-[var(--shadow-lift)] sm:p-10">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
              <h2 id="impact-heading" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-forest">
                <span className="relative flex size-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-success" /></span>
                {t("liveImpact")} · USD
              </h2>
              {hasDemo && <DemoBadge />}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-5">
              {statItems.map((s, i) => (
                <div key={s.label} className={i < 3 ? "md:border-r md:border-line md:pr-4" : ""}>
                  <dt className="text-xs font-medium text-muted">{s.label}</dt>
                  <dd className="mt-1 text-2xl font-bold text-navy sm:text-[1.7rem]">
                    <Counter value={s.value} format={s.usd ? "usd" : "number"} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      {/* 03 — Urgent */}
      {urgent.length > 0 && (
        <section className="py-20 sm:py-24">
          <Container>
            <SectionHeading
              eyebrow={t("urgent")}
              title={t("urgentTitle")}
              intro="Verified needs with close deadlines. Every gift moves these families and schools closer to their goal."
              action={<Link href="/urgent" className={btn("outline")}>All urgent projects <ArrowRight className="size-4" /></Link>}
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {urgent.map((p, i) => <Reveal key={p.id} delay={i * 90}><ProjectCard p={p} /></Reveal>)}
            </div>
          </Container>
        </section>
      )}

      {/* 04 — Categories */}
      <section className="bg-white py-20 sm:py-24">
        <Container>
          <SectionHeading eyebrow="Causes" title={t("categoriesTitle")} intro="Choose a cause close to your heart. Each category shows live, verified needs." />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {catStats.map((c, i) => (
              <Reveal key={c.id} delay={(i % 4) * 60}>
                <Link href={`/projects?category=${c.slug}`} className="group relative block overflow-hidden rounded-2xl bg-forest-deep text-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.image} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover opacity-70 transition duration-700 group-hover:scale-105 group-hover:opacity-60 sm:aspect-[4/4]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-deep via-forest-deep/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <h3 className="font-serif text-lg leading-tight sm:text-xl">{c.name}</h3>
                    <p className="mt-1 line-clamp-2 hidden text-xs text-white/75 sm:block">{c.description}</p>
                    <p className="mt-2 text-xs font-semibold text-gold">
                      {c.active > 0 ? `${c.active} active · ${usd(c.remaining, { compact: true })} needed` : "No active projects"}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* 05 — Featured */}
      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Featured"
            title={t("featuredTitle")}
            action={<Link href="/projects" className={btn("outline")}>View all projects <ArrowRight className="size-4" /></Link>}
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((p, i) => <Reveal key={p.id} delay={(i % 3) * 90}><ProjectCard p={p} /></Reveal>)}
          </div>
        </Container>
      </section>

      {/* 06 — How it works */}
      <section className="bg-forest-deep py-20 text-white sm:py-24">
        <Container>
          <SectionHeading light eyebrow="Simple & transparent" title={t("howTitle")} />
          <ol className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {[
              [BadgeCheck, "Choose a verified project", "Every project is visited and verified by our field team before it is published."],
              [CreditCard, "Make a secure donation", "Give in USD through a secure hosted payment page or bank transfer."],
              [LineChart, "Track project progress", "Follow milestones, expenses and photo updates from your donor portal."],
              [Eye, "See your impact", "Receive the final report with before-and-after photos and a full account of spending."],
            ].map(([Icon, title, body], i) => {
              const I = Icon as typeof BadgeCheck;
              return (
                <li key={i} className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                  <span className="font-num absolute right-5 top-4 font-serif text-5xl text-white/10">0{i + 1}</span>
                  <I className="size-9 text-gold" aria-hidden />
                  <h3 className="mt-5 font-serif text-xl">{title as string}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{body as string}</p>
                </li>
              );
            })}
          </ol>
        </Container>
      </section>

      {/* 07 — Recent donations + 09 Transparency */}
      <section className="py-20 sm:py-24">
        <Container className="grid grid-cols-1 gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <SectionHeading eyebrow="Community" title={t("recentTitle")} />
            <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
              {recent.rows.map((d) => (
                <li key={d.id} className="flex gap-3 p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest-50 text-xl" title={countryName(d.country)}>{flag(d.country)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
                      <span className="font-semibold text-navy">{d.name}</span>
                      <span className="font-num font-bold text-forest">{usd(d.amountCents)}</span>
                    </p>
                    <p className="truncate text-xs text-muted">
                      {d.project ? <Link className="hover:text-forest" href={`/projects/${d.project.slug}`}>{d.project.title}</Link> : "General Fund"} · {date(d.date)}
                    </p>
                    {d.message && <p className="mt-1 text-xs italic text-navy/70">“{d.message}”</p>}
                  </div>
                </li>
              ))}
            </ul>
            {recent.rows.some((r) => r.isDemo) && <p className="mt-3 text-xs text-muted">Donor names shown are demonstration records.</p>}
          </div>

          <div className="lg:col-span-3">
            <SectionHeading
              eyebrow={t("transparency")}
              title={t("transparencyTitle")}
              action={<Link href="/transparency" className={btn("outline", "sm")}>Full dashboard</Link>}
            />
            <div className="rounded-[var(--radius-card)] border border-line bg-white p-6 sm:p-8">
              <dl className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ["Gross received", stats.grossReceived],
                  ["Processing fees", stats.fees],
                  ["Refunds", stats.refunds],
                  ["Net received", stats.net],
                  ["Project expenses", stats.projectExpenses],
                  ["Admin expenses", stats.adminExpenses],
                  ["Available balance", stats.available],
                  ["Still required", stats.remaining],
                ].map(([l, v]) => (
                  <div key={l as string} className="rounded-xl bg-ivory p-3">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{l}</dt>
                    <dd className="font-num mt-1 text-lg font-bold text-navy">{usd(v as number)}</dd>
                  </div>
                ))}
              </dl>
              <AllocationDonut
                data={[
                  { name: "Spent on projects", value: stats.projectExpenses },
                  { name: "Administration", value: stats.adminExpenses },
                  { name: "Held for active projects", value: Math.max(0, stats.available) },
                ]}
              />
            </div>
          </div>
        </Container>
      </section>

      {/* 08 — Completed */}
      {completed.length > 0 && (
        <section className="bg-white py-20 sm:py-24">
          <Container>
            <SectionHeading eyebrow={t("completed")} title={t("completedTitle")} action={<Link href="/completed" className={btn("outline")}>All completed <ArrowRight className="size-4" /></Link>} />
            <div className="space-y-8">
              {await Promise.all(completed.map(async (p) => {
                const media = await db.media.findMany({ where: { projectId: p.id, stage: { in: ["BEFORE", "AFTER"] } }, orderBy: { sortOrder: "asc" } });
                const before = media.find((m) => m.stage === "BEFORE")?.url ?? p.coverImage;
                const after = media.find((m) => m.stage === "AFTER")?.url ?? p.coverImage;
                return (
                  <article key={p.id} className="grid overflow-hidden rounded-[var(--radius-card)] border border-line bg-ivory lg:grid-cols-2">
                    <div className="grid grid-cols-2">
                      {[["Before", before], ["After", after]].map(([l, src]) => (
                        <figure key={l} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`${p.title} — ${l.toLowerCase()}`} loading="lazy" className="h-full min-h-64 w-full object-cover" />
                          <figcaption className="absolute left-3 top-3 rounded-full bg-navy/80 px-3 py-1 text-xs font-semibold text-white">{l}</figcaption>
                        </figure>
                      ))}
                    </div>
                    <div className="p-6 sm:p-10">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-forest">{p.category.name}</p>
                        {p.isDemo && <DemoBadge />}
                      </div>
                      <h3 className="mt-2 font-serif text-2xl text-navy sm:text-3xl">{p.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted">{p.outcome}</p>
                      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                        <div><dt className="text-xs text-muted">Funding received</dt><dd className="font-num font-bold">{usd(p.finance.gross)}</dd></div>
                        <div><dt className="text-xs text-muted">Expenditure</dt><dd className="font-num font-bold">{usd(p.finance.expensesPaid)}</dd></div>
                        <div><dt className="text-xs text-muted">Beneficiaries</dt><dd className="font-num font-bold">{num(p.finalBeneficiaries || p.directBeneficiaries)}</dd></div>
                        <div><dt className="text-xs text-muted">Completed</dt><dd className="font-bold">{date(p.completedAt)}</dd></div>
                      </dl>
                      <Link href={`/projects/${p.slug}#impact`} className={btn("primary", "md", "mt-7")}>View Impact Report <ArrowRight className="size-4" /></Link>
                    </div>
                  </article>
                );
              }))}
            </div>
          </Container>
        </section>
      )}

      {/* 10 — Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-20 sm:py-24">
          <Container>
            <SectionHeading eyebrow="Voices" title={t("storiesTitle")} />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {testimonials.map((s) => (
                <figure key={s.id} className="flex gap-5 rounded-[var(--radius-card)] border border-line bg-white p-6">
                  {s.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt="" loading="lazy" className="size-20 shrink-0 rounded-2xl object-cover" />
                  )}
                  <div>
                    <Quote className="size-6 text-gold" aria-hidden />
                    <blockquote className="mt-2 font-serif text-lg leading-snug text-navy">{s.quote}</blockquote>
                    <figcaption className="mt-3 text-sm text-muted">
                      <span className="font-semibold text-navy">{s.name}</span> · {s.role.charAt(0) + s.role.slice(1).toLowerCase()}
                    </figcaption>
                  </div>
                </figure>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* 11 — Final CTA */}
      <section className="px-5 pb-20 sm:px-8">
        <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-forest px-6 py-16 text-center text-white sm:px-16 sm:py-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/photos/15-slk-lg.jpg" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20" />
          <Sparkles className="mx-auto size-8 text-gold" aria-hidden />
          <h2 className="mx-auto mt-4 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">{t("ctaTitle")}</h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/donate" variant="gold" size="lg"><Heart className="size-5" /> {t("makeDonation")}</ButtonLink>
            <ButtonLink href="/projects" variant="ghostLight" size="lg">{t("sponsorProject")}</ButtonLink>
            <ButtonLink href="/contact?subject=Volunteering" variant="ghostLight" size="lg"><HandHeart className="size-5" /> {t("volunteer")}</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
