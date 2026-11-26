import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck, Bookmark, Calendar, CalendarClock, CheckCircle2, Circle, ClipboardCheck, Download, FileText, Heart, MapPin, Search, ShieldCheck, Users,
} from "lucide-react";
import { ProgressBar } from "@/components/animated";
import { HeaderGallery, StageGallery } from "@/components/gallery";
import { SectionTabs } from "@/components/section-tabs";
import { ShareButtons } from "@/components/share-buttons";
import { Container, DemoBadge, EmptyState, StatusPill, UrgentBadge, VerifiedBadge, btn } from "@/components/ui";
import { getProjectBySlug, getPublicDonations, STATUS_LABELS } from "@/lib/queries";
import { itemRemaining } from "@/lib/finance";
import { cn, countryName, date, daysLeft, flag, num, usd } from "@/lib/format";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toggleSaved } from "@/app/actions/account";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProjectBySlug(slug);
  if (!p || !p.isPublic) return { title: "Project not found" };
  return {
    title: p.seoTitle ? { absolute: p.seoTitle } : p.title,
    description: p.metaDescription || p.shortDescription,
    alternates: { canonical: `/projects/${p.slug}` },
    openGraph: { title: p.title, description: p.shortDescription, images: [p.coverImage], type: "article" },
    twitter: { card: "summary_large_image", title: p.title, description: p.shortDescription, images: [p.coverImage] },
  };
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = await getProjectBySlug(slug);
  const scheduled = p?.publishedAt && p.publishedAt > new Date();
  if (!p || !p.isPublic || scheduled || ["DRAFT", "PENDING_VERIFICATION", "APPROVED"].includes(p.status)) notFound();

  const f = p.finance;
  const left = daysLeft(p.deadline);
  const canDonate = ["FUNDRAISING", "FULLY_FUNDED", "IN_PROGRESS"].includes(p.status);
  const completed = p.status === "COMPLETED";

  const dPage = Math.max(1, Number(sp.dpage ?? 1) || 1);
  const dSort = sp.dsort === "highest" ? "highest" : "latest";
  const perPage = 10;
  const donors = await getPublicDonations({ projectId: p.id, take: perPage, skip: (dPage - 1) * perPage, sort: dSort, q: sp.dq });
  const pages = Math.max(1, Math.ceil(donors.count / perPage));
  const user = await currentUser();
  const isSaved = user ? !!(await db.savedProject.findUnique({ where: { userId_projectId: { userId: user.id, projectId: p.id } } })) : false;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "story", label: "Project Story" },
    { id: "requirements", label: "Requirements" },
    { id: "donors", label: "Donors" },
    { id: "updates", label: "Updates" },
    { id: "expenses", label: "Expenses" },
    { id: "gallery", label: "Gallery" },
    { id: "documents", label: "Documents" },
    ...(completed ? [{ id: "impact", label: "Impact Report" }] : []),
  ];

  const story: [string, string][] = [
    ["Project background", p.background], ["Current situation", p.situation], ["Identified problems", p.problems],
    ["Why assistance is required", p.whyNeeded], ["Project objectives", p.objectives], ["Proposed solution", p.solution],
    ["Implementation plan", p.implementation], ["Expected outcomes", p.outcomes], ["Long-term impact", p.longTermImpact],
    ["Sustainability plan", p.sustainability],
  ].filter(([, v]) => v) as [string, string][];

  const budgetTotal = p.budgetItems.reduce((s, i) => s + i.quantity * i.unitCents, 0);
  const paidExpenses = p.expenses.filter((e) => e.status === "PAID" && e.isPublic);
  const committedExpenses = p.expenses.filter((e) => e.status === "APPROVED" && e.isPublic);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DonateAction",
    name: p.title,
    description: p.shortDescription,
    url: `${siteUrl}/projects/${p.slug}`,
    image: `${siteUrl}${p.coverImage}`,
    recipient: { "@type": "NGO", name: "Minnesota Sri Lanka Friendship Foundation" },
    price: (f.goal / 100).toFixed(2),
    priceCurrency: "USD",
  };

  const summaryCard = (
    <div className="rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-[var(--shadow-lift)]">
      <p className="font-num text-3xl font-bold text-navy">{usd(f.gross)}</p>
      <p className="text-sm text-muted">raised of <span className="font-num font-semibold text-navy">{usd(f.goal)}</span> goal</p>
      <ProgressBar percent={f.percent} tall className="mt-4" />
      <div className="mt-2 flex justify-between text-sm">
        <span className="font-num font-bold text-forest">{f.percent.toFixed(f.percent % 1 ? 1 : 0)}% funded</span>
        <span className="font-num text-muted">{num(p.donorCount)} donors</span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-ivory p-3"><dt className="text-xs text-muted">Remaining</dt><dd className="font-num font-bold text-navy">{usd(f.remainingGross)}</dd></div>
        <div className="rounded-xl bg-ivory p-3"><dt className="text-xs text-muted">{completed ? "Completed" : "Deadline"}</dt><dd className="font-bold text-navy">{completed ? date(p.completedAt) : left !== null ? (left > 0 ? `${left} days left` : "Closed") : "Open"}</dd></div>
      </dl>
      {canDonate && (
        <div className="mt-5 space-y-2">
          <Link href={`/donate?project=${p.slug}`} className={btn("primary", "lg", "w-full")}><Heart className="size-5 fill-current" /> Donate Now</Link>
          {p.budgetItems.some((i) => i.sponsorable && itemRemaining(i) > 0) && (
            <a href="#requirements" className={btn("outline", "md", "w-full")}>Sponsor an item</a>
          )}
        </div>
      )}
      {completed && <a href="#impact" className={btn("gold", "lg", "mt-5 w-full")}>View Impact Report</a>}
      {user && (
        <form action={toggleSaved} className="mt-2">
          <input type="hidden" name="projectId" value={p.id} />
          <input type="hidden" name="slug" value={p.slug} />
          <button className={btn("quiet", "sm", "w-full")}><Bookmark className={cn("size-4", isSaved && "fill-current")} /> {isSaved ? "Saved to your portal" : "Save project"}</button>
        </form>
      )}
      <p className="mt-4 flex items-start gap-2 text-xs text-muted"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-forest" /> Totals update only after a payment is confirmed by the payment provider or verified by our finance team.</p>
    </div>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <section className="border-b border-line bg-white">
        <Container className="py-8 sm:py-10">
          <nav aria-label="Breadcrumb" className="mb-5 text-xs text-muted">
            <Link href="/projects" className="hover:text-forest">Projects</Link> <span aria-hidden>/</span>{" "}
            <Link href={`/projects?category=${p.category.slug}`} className="hover:text-forest">{p.category.name}</Link>
          </nav>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <HeaderGallery cover={p.coverImage} title={p.title} items={p.media.map((m) => ({ url: m.url, caption: m.caption || p.title, stage: m.stage, kind: m.kind }))} />
            </div>
            <div className="lg:col-span-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-forest-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-forest">{p.code}</span>
                {p.verificationStatus === "VERIFIED" && <span className="rounded-full border border-forest/20"><VerifiedBadge label="Verified project" /></span>}
                {p.priority === "URGENT" && p.status === "FUNDRAISING" && <UrgentBadge />}
                {p.priority === "HIGH" && <span className="rounded-full bg-gold-soft px-2.5 py-1 text-xs font-semibold text-forest-deep">High priority</span>}
                <StatusPill status={p.status} label={STATUS_LABELS[p.status]} />
                {p.isDemo && <DemoBadge />}
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-forest">{p.category.name}</p>
              <h1 className="mt-1 font-serif text-3xl leading-tight text-navy sm:text-4xl">{p.title}</h1>
              <p className="mt-3 text-base leading-relaxed text-muted">{p.shortDescription}</p>
              <ul className="mt-5 grid gap-2 text-sm text-navy/80 sm:grid-cols-2">
                <li className="flex items-center gap-2"><MapPin className="size-4 text-forest" />{p.location}</li>
                <li className="flex items-center gap-2"><Users className="size-4 text-forest" />{num(p.directBeneficiaries)} direct beneficiaries</li>
                <li className="flex items-center gap-2"><Calendar className="size-4 text-forest" />Published {date(p.publishedAt)}</li>
                <li className="flex items-center gap-2"><CalendarClock className="size-4 text-forest" />Deadline {date(p.deadline)}</li>
              </ul>
              <div className="mt-6 lg:hidden">{summaryCard}</div>
              <div className="mt-6 hidden lg:block">
                <ShareButtons url={`${siteUrl}/projects/${p.slug}`} title={p.title} />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="pb-28 lg:pb-20">
        <SectionTabs tabs={tabs} />
        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <div className="min-w-0 space-y-14 lg:col-span-8">
            {/* Overview */}
            <section id="overview" className="scroll-mt-36">
              <h2 className="font-serif text-2xl text-navy">Financial summary</h2>
              <p className="mt-1 text-sm text-muted">All amounts in USD. Calculated from confirmed payments and approved expense records.</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  ["Total required", f.goal], ["Donations collected", f.gross], ["Remaining required", f.remainingGross],
                  ["Processing fees", f.fees], ["Net donations received", f.net], ["Project expenses (paid)", f.expensesPaid],
                  ["Committed (approved, unpaid)", f.commitments], ["Available project balance", f.available], ["Overfunded amount", f.overfunded],
                ].map(([l, v]) => (
                  <div key={l as string} className="rounded-xl border border-line bg-white p-4">
                    <dt className="text-xs text-muted">{l}</dt>
                    <dd className="font-num mt-1 text-xl font-bold text-navy">{usd(v as number)}</dd>
                  </div>
                ))}
                <div className="rounded-xl border border-line bg-white p-4"><dt className="text-xs text-muted">Funding completion</dt><dd className="font-num mt-1 text-xl font-bold text-forest">{f.percent}%</dd></div>
                <div className="rounded-xl border border-line bg-white p-4"><dt className="text-xs text-muted">Number of donors</dt><dd className="font-num mt-1 text-xl font-bold text-navy">{num(p.donorCount)}</dd></div>
              </dl>

              <h3 className="mt-10 font-serif text-xl text-navy">Who this project helps</h3>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  ["Beneficiary type", p.beneficiaryType], ["Families", p.families], ["Children", p.children], ["Students", p.students],
                  ["Elderly", p.elderly], ["Community", p.district + " District"], ["Direct beneficiaries", p.directBeneficiaries], ["Indirect beneficiaries", p.indirectBeneficiaries],
                ].filter(([, v]) => v !== 0 && v !== "").map(([l, v]) => (
                  <div key={l as string} className="rounded-xl bg-white p-3 ring-1 ring-line">
                    <dt className="text-xs text-muted">{l}</dt>
                    <dd className="font-num font-semibold text-navy">{typeof v === "number" ? num(v) : v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-muted">To protect dignity and privacy, we publish only aggregated information. Identity documents, addresses, medical records and children&apos;s personal details are never shown.</p>
            </section>

            {/* Story */}
            <section id="story" className="scroll-mt-36">
              <h2 className="font-serif text-2xl text-navy">About the project</h2>
              <div className="prose-story mt-2">
                {story.map(([h, body]) => (
                  <div key={h}>
                    <h3>{h}</h3>
                    {body.split(/\n+/).map((para, i) => <p key={i}>{para}</p>)}
                  </div>
                ))}
              </div>
            </section>

            {/* Verification & timeline (part of story context) */}
            <section aria-labelledby="verification-h" className="scroll-mt-36 rounded-[var(--radius-card)] border border-forest/15 bg-forest-50/60 p-6">
              <h2 id="verification-h" className="flex items-center gap-2 font-serif text-2xl text-navy"><ClipboardCheck className="size-6 text-forest" /> Project verification</h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-muted">Status</dt><dd className="font-semibold text-forest">{p.verificationStatus === "VERIFIED" ? "Verified" : p.verificationStatus.toLowerCase()}</dd></div>
                <div><dt className="text-xs text-muted">Verification date</dt><dd className="font-semibold">{date(p.verificationDate)}</dd></div>
                <div><dt className="text-xs text-muted">Responsible team</dt><dd className="font-semibold">{p.verificationTeam || "—"}</dd></div>
              </dl>
              {p.verificationSummary && <p className="mt-4 text-sm leading-relaxed text-navy/80">{p.verificationSummary}</p>}
              {p.siteVisit && <p className="mt-2 text-sm leading-relaxed text-navy/80"><span className="font-semibold">Site visit: </span>{p.siteVisit}</p>}
              <p className="mt-3 text-xs text-muted">Organisation approval: approved for fundraising. Private verification documents are restricted to authorised staff.</p>
            </section>

            <section aria-labelledby="timeline-h" className="scroll-mt-36">
              <h2 id="timeline-h" className="font-serif text-2xl text-navy">Project timeline</h2>
              <ol className="relative mt-6 space-y-6 border-l-2 border-line pl-7">
                {p.milestones.map((m) => (
                  <li key={m.id} className="relative">
                    <span className={cn("absolute -left-[2.15rem] top-0.5 flex size-6 items-center justify-center rounded-full bg-ivory", m.done ? "text-success" : "text-line")}>
                      {m.done ? <CheckCircle2 className="size-6" /> : <Circle className="size-5" />}
                    </span>
                    <p className={cn("font-semibold", m.done ? "text-navy" : "text-muted")}>{m.title}</p>
                    {m.date && <p className="text-xs text-muted">{date(m.date, "long")}</p>}
                    {m.description && m.done && <p className="mt-1 text-sm text-navy/70">{m.description}</p>}
                  </li>
                ))}
              </ol>
            </section>

            {/* Requirements */}
            <section id="requirements" className="scroll-mt-36">
              <h2 className="font-serif text-2xl text-navy">Detailed project requirements</h2>
              <p className="mt-1 text-sm text-muted">Fund the whole project, or sponsor specific items. Item quantities are reserved only when your payment is confirmed, so items can never be funded twice.</p>
              {p.budgetItems.length === 0 ? (
                <div className="mt-5"><EmptyState title="No itemised budget published" /></div>
              ) : (
                <div className="mt-5 relative overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-ivory text-left text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Item</th>
                        <th className="px-3 py-3 text-right font-semibold">Qty</th>
                        <th className="px-3 py-3 text-right font-semibold">Unit cost</th>
                        <th className="px-3 py-3 text-right font-semibold">Total</th>
                        <th className="px-3 py-3 text-right font-semibold">Funded</th>
                        <th className="px-3 py-3 text-right font-semibold">Remaining</th>
                        <th className="px-4 py-3"><span className="sr-only">Action</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {p.budgetItems.map((i) => {
                        const rem = itemRemaining(i);
                        return (
                          <tr key={i.id} className="align-top">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-navy">{i.name}</p>
                              {i.description && <p className="text-xs text-muted">{i.description}</p>}
                            </td>
                            <td className="font-num px-3 py-3 text-right">{num(i.quantity)}</td>
                            <td className="font-num px-3 py-3 text-right">{usd(i.unitCents)}</td>
                            <td className="font-num px-3 py-3 text-right font-semibold">{usd(i.quantity * i.unitCents)}</td>
                            <td className="font-num px-3 py-3 text-right">{num(i.fundedQty)}<span className="block text-xs text-muted">{usd(i.fundedQty * i.unitCents)}</span></td>
                            <td className="font-num px-3 py-3 text-right">{num(rem)}<span className="block text-xs text-muted">{usd(rem * i.unitCents)}</span></td>
                            <td className="px-4 py-3 text-right">
                              {i.sponsorable && rem > 0 && p.status === "FUNDRAISING" ? (
                                <Link href={`/donate?project=${p.slug}&item=${i.id}`} className={btn("outline", "sm")}>Sponsor item</Link>
                              ) : (
                                <span className="text-xs font-semibold text-success">{rem === 0 ? "Fully sponsored" : "—"}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-ivory font-semibold">
                      <tr>
                        <td className="px-4 py-3" colSpan={3}>Total budget</td>
                        <td className="font-num px-3 py-3 text-right">{usd(budgetTotal)}</td>
                        <td colSpan={3} className="px-4 py-3 text-right text-xs font-normal text-muted">Item sponsorships are counted within the project total raised.</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>

            {/* Donors */}
            <section id="donors" className="scroll-mt-36">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl text-navy">Project donors</h2>
                  <p className="mt-1 text-sm text-muted"><span className="font-num font-semibold text-navy">{num(donors.count)}</span> confirmed donations · <span className="font-num font-semibold text-navy">{usd(donors.totalCents)}</span> collected</p>
                </div>
                <form method="get" action={`/projects/${p.slug}#donors`} className="flex gap-2">
                  <label htmlFor="dq" className="sr-only">Search donors</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input id="dq" name="dq" defaultValue={sp.dq} placeholder="Search donors" className="field h-10 w-44 py-0 pl-9" />
                  </div>
                  <select name="dsort" defaultValue={dSort} className="field h-10 w-auto py-0" aria-label="Sort donors">
                    <option value="latest">Latest</option>
                    <option value="highest">Highest</option>
                  </select>
                  <button className={btn("outline", "sm", "h-10")}>Go</button>
                </form>
              </div>
              {donors.rows.length === 0 ? (
                <div className="mt-5"><EmptyState title={sp.dq ? "No donors match your search" : "Be the first to donate"} /></div>
              ) : (
                <div className="mt-5 relative overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-ivory text-left text-xs uppercase tracking-wide text-muted">
                      <tr><th className="px-4 py-3">Donor</th><th className="px-3 py-3">Country</th><th className="px-3 py-3">Date</th><th className="px-4 py-3 text-right">Amount</th></tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {donors.rows.map((d) => (
                        <tr key={d.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-navy">{d.name} {d.donorType !== "INDIVIDUAL" && d.name !== "Anonymous" && <span className="ml-1 rounded bg-gold-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-forest-deep">{d.donorType === "CORPORATE" ? "Corporate" : "Organisation"}</span>}</p>
                            {d.message && <p className="text-xs italic text-muted">“{d.message}”</p>}
                          </td>
                          <td className="px-3 py-3"><span className="mr-1.5">{flag(d.country)}</span>{countryName(d.country)}</td>
                          <td className="px-3 py-3 text-muted">{date(d.date)}</td>
                          <td className="font-num px-4 py-3 text-right font-bold text-forest">{usd(d.amountCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {pages > 1 && (
                <nav aria-label="Donor pages" className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted">Page {dPage} of {pages}</span>
                  <div className="flex gap-2">
                    {dPage > 1 && <Link className={btn("outline", "sm")} href={`/projects/${p.slug}?dpage=${dPage - 1}&dsort=${dSort}${sp.dq ? `&dq=${encodeURIComponent(sp.dq)}` : ""}#donors`}>Previous</Link>}
                    {dPage < pages && <Link className={btn("outline", "sm")} href={`/projects/${p.slug}?dpage=${dPage + 1}&dsort=${dSort}${sp.dq ? `&dq=${encodeURIComponent(sp.dq)}` : ""}#donors`}>Next</Link>}
                  </div>
                </nav>
              )}
            </section>

            {/* Updates */}
            <section id="updates" className="scroll-mt-36">
              <h2 className="font-serif text-2xl text-navy">Project updates</h2>
              {p.updates.length === 0 ? (
                <div className="mt-5"><EmptyState title="No updates yet" body="Donors who opt in are emailed when the team posts an update." /></div>
              ) : (
                <ol className="mt-5 space-y-5">
                  {p.updates.map((u) => (
                    <li key={u.id} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white sm:flex">
                      {u.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.image} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover sm:aspect-auto sm:w-56" />
                      )}
                      <div className="p-5">
                        <p className="text-xs text-muted">{date(u.createdAt, "long")}{u.milestone && ` · ${u.milestone}`}</p>
                        <h3 className="mt-1 font-serif text-lg text-navy">{u.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-navy/75">{u.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Expenses */}
            <section id="expenses" className="scroll-mt-36">
              <h2 className="font-serif text-2xl text-navy">Project expense records</h2>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-white p-4 ring-1 ring-line"><dt className="text-xs text-muted">Total paid</dt><dd className="font-num text-lg font-bold">{usd(f.expensesPaid)}</dd></div>
                <div className="rounded-xl bg-white p-4 ring-1 ring-line"><dt className="text-xs text-muted">Committed</dt><dd className="font-num text-lg font-bold">{usd(f.commitments)}</dd></div>
                <div className="rounded-xl bg-white p-4 ring-1 ring-line"><dt className="text-xs text-muted">Available funds</dt><dd className="font-num text-lg font-bold text-forest">{usd(f.available)}</dd></div>
              </dl>
              {paidExpenses.length + committedExpenses.length === 0 ? (
                <div className="mt-5"><EmptyState title="No expenses recorded yet" body="Expenses appear here once approved by the finance team." /></div>
              ) : (
                <div className="mt-5 relative overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="bg-ivory text-left text-xs uppercase tracking-wide text-muted">
                      <tr><th className="px-4 py-3">Expense</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Status</th><th className="px-4 py-3 text-right">Amount</th></tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {[...paidExpenses, ...committedExpenses].map((e) => (
                        <tr key={e.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-navy">{e.title}</p>
                            <p className="text-xs text-muted">{e.description}{e.milestone && ` · Milestone: ${e.milestone.title}`}</p>
                            {e.invoiceUrl && <a href={e.invoiceUrl} className="text-xs font-semibold text-forest hover:underline">Redacted invoice</a>}
                          </td>
                          <td className="px-3 py-3">{e.category}</td>
                          <td className="px-3 py-3 text-muted">{date(e.date)}</td>
                          <td className="px-3 py-3"><StatusPill status={e.status === "PAID" ? "PAID" : "PENDING"} label={e.status === "PAID" ? "Paid" : "Committed"} /></td>
                          <td className="font-num px-4 py-3 text-right font-semibold">{usd(e.amountCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Gallery */}
            <section id="gallery" className="scroll-mt-36">
              <h2 className="font-serif text-2xl text-navy">Project gallery</h2>
              <div className="mt-5">
                {p.media.length ? <StageGallery items={p.media.map((m) => ({ url: m.url, caption: m.caption || p.title, stage: m.stage, kind: m.kind }))} /> : <EmptyState title="No photos yet" />}
              </div>
            </section>

            {/* Documents */}
            <section id="documents" className="scroll-mt-36">
              <h2 className="font-serif text-2xl text-navy">Documents</h2>
              {p.documents.length === 0 ? (
                <div className="mt-5"><EmptyState title="No public documents" /></div>
              ) : (
                <ul className="mt-5 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white">
                  {p.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 p-4">
                      <span className="flex items-center gap-3"><FileText className="size-5 text-forest" /> <span className="font-medium">{d.title}</span></span>
                      {d.url && d.url !== "#" ? (
                        <a href={d.url} className={btn("outline", "sm")}><Download className="size-4" /> Download</a>
                      ) : (
                        <span className="text-xs text-muted">Available on request</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Impact report */}
            {completed && (
              <section id="impact" className="scroll-mt-36 overflow-hidden rounded-[var(--radius-card)] border border-forest/20 bg-white">
                <div className="bg-forest p-6 text-white sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Final project report</p>
                  <h2 className="mt-2 font-serif text-3xl">Impact report</h2>
                  <p className="mt-3 max-w-2xl text-white/80">{p.impactStatement}</p>
                </div>
                <div className="p-6 sm:p-8">
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      ["Original target", usd(f.goal)], ["Donations collected", usd(f.gross)], ["Processing fees", usd(f.fees)], ["Net funds received", usd(f.net)],
                      ["Actual expenditure", usd(f.expensesPaid)], ["Remaining balance", usd(f.available)], ["Final beneficiaries", num(p.finalBeneficiaries)], ["Completion date", date(p.completedAt)],
                    ].map(([l, v]) => (
                      <div key={l}><dt className="text-xs text-muted">{l}</dt><dd className="font-num text-lg font-bold text-navy">{v}</dd></div>
                    ))}
                  </dl>
                  <h3 className="mt-8 font-serif text-xl text-navy">Achieved objectives</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy/80">{p.outcome}</p>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {(["BEFORE", "AFTER"] as const).map((s) => {
                      const m = p.media.find((x) => x.stage === s);
                      return m ? (
                        <figure key={s} className="relative overflow-hidden rounded-xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.url} alt={`${s.toLowerCase()} photo`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                          <figcaption className="absolute left-2 top-2 rounded-full bg-navy/80 px-2.5 py-0.5 text-xs font-semibold text-white">{s === "BEFORE" ? "Before" : "After"}</figcaption>
                        </figure>
                      ) : null;
                    })}
                  </div>
                  <a href={`/api/projects/${p.slug}/report`} className={btn("primary", "md", "mt-6")}><Download className="size-4" /> Download PDF report</a>
                </div>
              </section>
            )}
          </div>

          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-36 space-y-4">
              {summaryCard}
              <div className="rounded-[var(--radius-card)] border border-line bg-white p-5 text-sm">
                <p className="flex items-center gap-2 font-semibold text-navy"><BadgeCheck className="size-5 text-forest" /> Our promise</p>
                <p className="mt-2 text-muted">Every project is visible. Every donation is accountable. Every contribution creates real impact.</p>
              </div>
            </div>
          </aside>
        </div>
      </Container>

      {/* Mobile sticky donate */}
      {canDonate && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-num text-sm font-bold text-navy">{usd(f.gross)} <span className="font-normal text-muted">of {usd(f.goal)}</span></p>
              <ProgressBar percent={f.percent} className="mt-1" />
            </div>
            <Link href={`/donate?project=${p.slug}`} className={btn("primary", "md")}><Heart className="size-4 fill-current" /> Donate</Link>
          </div>
        </div>
      )}
    </>
  );
}
