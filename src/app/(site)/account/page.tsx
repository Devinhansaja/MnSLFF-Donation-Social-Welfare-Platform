import Link from "next/link";
import { Bell, Bookmark, Download, FileText, Heart, LogOut, Repeat } from "lucide-react";
import { requireDonor } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjects } from "@/lib/queries";
import { CONFIRMED_STATUSES, sumDonations } from "@/lib/finance";
import { receiptToken } from "@/lib/receipt-token";
import { date, num, usd, cn } from "@/lib/format";
import { logout } from "@/app/actions/auth";
import { cancelMonthly, markNotificationsRead, toggleSaved } from "@/app/actions/account";
import { ProgressBar } from "@/components/animated";
import { Container, DemoBadge, EmptyState, StatusPill, btn } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { SubmitButton } from "@/components/forms";

export const metadata = { title: "My donor portal", robots: { index: false } };

const TABS = [
  ["overview", "Overview"], ["donations", "Donations & receipts"], ["projects", "My projects"], ["updates", "Updates"],
  ["monthly", "Monthly giving"], ["saved", "Saved"], ["settings", "Profile & privacy"],
];

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireDonor();
  const { tab = "overview" } = await searchParams;
  const donorId = user.donor?.id ?? "__none__";

  const [donations, notifications, saved] = await Promise.all([
    db.donation.findMany({ where: { donorId }, orderBy: { createdAt: "desc" }, include: { project: { select: { title: true, slug: true, id: true } }, budgetItem: { select: { name: true } } } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.savedProject.findMany({ where: { userId: user.id }, select: { projectId: true } }),
  ]);
  const confirmed = donations.filter((d) => (CONFIRMED_STATUSES as readonly string[]).includes(d.status));
  const totals = sumDonations(confirmed);
  const supportedIds = [...new Set(confirmed.map((d) => d.project?.id).filter(Boolean))] as string[];
  const [supported, savedProjects, updates] = await Promise.all([
    getProjects({ id: { in: supportedIds } }),
    getProjects({ id: { in: saved.map((s) => s.projectId) } }),
    db.projectUpdate.findMany({ where: { projectId: { in: supportedIds } }, orderBy: { createdAt: "desc" }, take: 20, include: { project: { select: { title: true, slug: true } } } }),
  ]);
  const monthly = donations.filter((d) => d.frequency === "MONTHLY" && d.status === "PAID");
  const years = [...new Set(confirmed.map((d) => (d.confirmedAt ?? d.createdAt).getFullYear()))].sort((a, b) => b - a);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">Donor portal</p>
          <h1 className="mt-1 font-serif text-4xl text-navy">Hello, {user.name.split(" ")[0]}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/donate" className={btn("primary", "sm")}><Heart className="size-4" /> Give again</Link>
          <form action={logout}><button className={btn("outline", "sm")}><LogOut className="size-4" /> Sign out</button></form>
        </div>
      </div>

      <nav aria-label="Portal sections" className="scrollbar-none mt-8 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([id, label]) => (
          <Link key={id} href={`/account?tab=${id}`} aria-current={tab === id ? "page" : undefined}
            className={cn("whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium", tab === id ? "border-forest text-forest" : "border-transparent text-muted hover:text-navy")}>
            {label}{id === "updates" && unread > 0 && <span className="ml-1.5 rounded-full bg-urgent px-1.5 text-[10px] font-bold text-white">{unread}</span>}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        {tab === "overview" && (
          <>
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                ["Lifetime donations", usd(totals.gross)], ["Projects supported", num(supported.length)],
                ["Active monthly gifts", num(monthly.length)], ["Completed projects supported", num(supported.filter((p) => p.status === "COMPLETED").length)],
              ].map(([l, v]) => (
                <div key={l} className="rounded-[var(--radius-card)] border border-line bg-white p-5">
                  <dt className="text-xs text-muted">{l}</dt><dd className="font-num mt-1 text-2xl font-bold text-navy">{v}</dd>
                </div>
              ))}
            </dl>
            <h2 className="mt-10 font-serif text-2xl text-navy">Projects you support</h2>
            <ProjectProgressList projects={supported} />
          </>
        )}

        {tab === "donations" && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-navy">Annual statements:</span>
              {years.length === 0 && <span className="text-sm text-muted">None yet</span>}
              {years.map((y) => <a key={y} href={`/api/account/statement?year=${y}`} className={btn("outline", "sm")}><FileText className="size-4" /> {y}</a>)}
            </div>
            {donations.length === 0 ? <EmptyState title="No donations yet" action={<Link href="/projects" className={btn("primary")}>Find a project</Link>} /> : (
              <div className="relative overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-ivory text-left text-xs uppercase tracking-wide text-muted">
                    <tr><th className="px-4 py-3">Date</th><th className="px-3 py-3">Reference</th><th className="px-3 py-3">Designation</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Amount</th><th className="px-4 py-3"><span className="sr-only">Receipt</span></th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {donations.map((d) => (
                      <tr key={d.id}>
                        <td className="px-4 py-3 text-muted">{date(d.createdAt)}</td>
                        <td className="px-3 py-3 font-mono text-xs">{d.reference} {d.isDemo && <DemoBadge />}</td>
                        <td className="px-3 py-3">{d.project ? <Link href={`/projects/${d.project.slug}`} className="hover:text-forest">{d.project.title}</Link> : "General Fund"}{d.budgetItem && <span className="block text-xs text-muted">{d.itemQuantity} × {d.budgetItem.name}</span>}</td>
                        <td className="px-3 py-3"><StatusPill status={d.status} /></td>
                        <td className="font-num px-3 py-3 text-right font-semibold">{usd(d.amountCents)}</td>
                        <td className="px-4 py-3 text-right">
                          {["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(d.status) && (
                            <a href={`/api/receipts/${d.reference}?t=${receiptToken(d.reference)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline"><Download className="size-3.5" /> Receipt</a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "projects" && <ProjectProgressList projects={supported} />}

        {tab === "updates" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-serif text-xl text-navy">Project updates</h2>
              {updates.length === 0 ? <div className="mt-4"><EmptyState title="No updates yet" /></div> : (
                <ul className="mt-4 space-y-3">
                  {updates.map((u) => (
                    <li key={u.id} className="rounded-xl border border-line bg-white p-4">
                      <p className="text-xs text-muted">{date(u.createdAt)} · <Link className="hover:text-forest" href={`/projects/${u.project.slug}#updates`}>{u.project.title}</Link></p>
                      <p className="mt-1 font-semibold text-navy">{u.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{u.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-serif text-xl text-navy"><Bell className="size-5" /> Notifications</h2>
                {unread > 0 && <form action={markNotificationsRead}><button className="text-xs font-semibold text-forest hover:underline">Mark all read</button></form>}
              </div>
              {notifications.length === 0 ? <div className="mt-4"><EmptyState title="No notifications" /></div> : (
                <ul className="mt-4 space-y-2">
                  {notifications.map((n) => (
                    <li key={n.id} className={cn("rounded-xl border p-4", n.read ? "border-line bg-white" : "border-forest/30 bg-forest-50")}>
                      <p className="text-sm font-semibold text-navy">{n.title}</p>
                      <p className="text-sm text-muted">{n.body}</p>
                      <p className="mt-1 text-xs text-muted">{date(n.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === "monthly" && (
          monthly.length === 0 ? <EmptyState title="No monthly gifts" body="Monthly giving gives projects reliable support." action={<Link href="/donate" className={btn("primary")}><Repeat className="size-4" /> Start a monthly gift</Link>} /> : (
            <ul className="space-y-3">
              {monthly.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
                  <div>
                    <p className="font-semibold text-navy">{usd(d.amountCents)} / month · {d.project?.title ?? "General Fund"}</p>
                    <p className="text-xs text-muted">Started {date(d.createdAt)} · {d.method}</p>
                  </div>
                  <form action={cancelMonthly}>
                    <input type="hidden" name="donationId" value={d.id} />
                    <SubmitButton variant="outline" size="sm" confirm="Cancel this monthly gift? Future payments will stop.">Cancel monthly gift</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "saved" && (
          savedProjects.length === 0 ? <EmptyState title="No saved projects" body="Use “Save” on any project page to follow it here." /> : (
            <div className="space-y-3">
              {savedProjects.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
                  <Link href={`/projects/${p.slug}`} className="font-semibold text-navy hover:text-forest">{p.title}</Link>
                  <form action={toggleSaved}><input type="hidden" name="projectId" value={p.id} /><button className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-urgent"><Bookmark className="size-3.5" /> Remove</button></form>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "settings" && (
          <div className="max-w-2xl rounded-[var(--radius-card)] border border-line bg-white p-6">
            <ProfileForm
              email={user.email}
              donor={user.donor ?? { fullName: user.name, companyName: null, phone: null, country: "US", publicProfile: false, showTotals: false, notifyUpdates: true }}
            />
          </div>
        )}
      </div>
    </Container>
  );
}

function ProjectProgressList({ projects }: { projects: Awaited<ReturnType<typeof getProjects>> }) {
  if (projects.length === 0) return <div className="mt-4"><EmptyState title="You haven't supported a project yet" action={<Link href="/projects" className={btn("primary")}>Explore projects</Link>} /></div>;
  return (
    <ul className="mt-4 grid gap-4 md:grid-cols-2">
      {projects.map((p) => (
        <li key={p.id} className="flex gap-4 rounded-[var(--radius-card)] border border-line bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.coverImage} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <Link href={`/projects/${p.slug}`} className="font-semibold text-navy hover:text-forest">{p.title}</Link>
            <div className="mt-1"><StatusPill status={p.status} /></div>
            <ProgressBar percent={p.finance.percent} className="mt-3" />
            <p className="font-num mt-1 text-xs text-muted">{usd(p.finance.gross)} of {usd(p.finance.goal)} · {Math.min(100, p.finance.percent)}%</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
