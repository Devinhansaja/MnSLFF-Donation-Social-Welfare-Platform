import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { getProjects, STATUS_LABELS } from "@/lib/queries";
import { date, num, usd } from "@/lib/format";
import { listPhotos } from "@/lib/admin-projects";
import { PageHeader, Section, StatCard, KV } from "@/components/admin/parts";
import { btn, StatusPill, DemoBadge } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { approveVerification, deleteUpdate, postUpdate, setProjectStatus, toggleMilestone } from "@/app/actions/admin/projects";
import { link, table, tbody, td, th } from "@/components/admin/styles";

const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING_VERIFICATION", "CANCELLED"],
  PENDING_VERIFICATION: ["DRAFT", "ON_HOLD", "CANCELLED"],
  APPROVED: ["FUNDRAISING", "ON_HOLD", "CANCELLED"],
  FUNDRAISING: ["FULLY_FUNDED", "IN_PROGRESS", "ON_HOLD", "CANCELLED", "CLOSED"],
  FULLY_FUNDED: ["IN_PROGRESS", "FUNDRAISING", "ON_HOLD"],
  IN_PROGRESS: ["COMPLETED", "ON_HOLD"],
  COMPLETED: ["CLOSED"],
  ON_HOLD: ["FUNDRAISING", "IN_PROGRESS", "CANCELLED", "CLOSED"],
  CANCELLED: ["CLOSED"],
  CLOSED: [],
};

export default async function ProjectAdmin({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("view");
  const { id } = await params;
  const [p] = await getProjects({ id });
  if (!p) notFound();
  const [milestones, updates, items, creator, photos, recent] = await Promise.all([
    db.milestone.findMany({ where: { projectId: id }, orderBy: { sortOrder: "asc" } }),
    db.projectUpdate.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" } }),
    db.budgetItem.findMany({ where: { projectId: id }, orderBy: { sortOrder: "asc" } }),
    db.auditLog.findFirst({ where: { entity: "project", entityId: id, action: "project.create" }, include: { user: true } }),
    listPhotos(),
    db.donation.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" }, take: 10, include: { donor: true } }),
  ]);
  const f = p.finance;
  const back = `/admin/projects/${id}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.title}
        intro={`${p.code} · ${p.category.name} · ${p.location}`}
        actions={
          <>
            {p.isPublic && <Link href={`/projects/${p.slug}`} target="_blank" className={btn("outline", "sm")}>Public page <ExternalLink className="size-3.5" /></Link>}
            {can(user.role, "project.edit") && <Link href={`${back}/edit`} className={btn("primary", "sm")}><Pencil className="size-4" /> Edit (wizard)</Link>}
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={p.status} label={STATUS_LABELS[p.status]} />
        <StatusPill status={p.verificationStatus === "VERIFIED" ? "PAID" : "PENDING"} label={`Verification: ${p.verificationStatus.toLowerCase()}`} />
        <span className="text-xs text-muted">Priority {p.priority.toLowerCase()} · {p.isPublic ? "Public" : "Hidden"} · {p.featured ? "Featured" : "Not featured"}</span>
        {p.isDemo && <DemoBadge />}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Fundraising target" value={usd(f.goal)} />
        <StatCard label="Gross collected" value={usd(f.gross)} tone="good" sub={`${f.percent}% · ${num(p.donorCount)} donors`} />
        <StatCard label="Remaining (gross)" value={usd(f.remainingGross)} tone="warn" />
        <StatCard label="Processing fees" value={usd(f.fees)} />
        <StatCard label="Net received" value={usd(f.net)} />
        <StatCard label="Expenses paid" value={usd(f.expensesPaid)} sub={`Commitments ${usd(f.commitments)}`} />
        <StatCard label="Available balance" value={usd(f.available)} tone="gold" />
        <StatCard label="Overfunded" value={usd(f.overfunded)} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="Status workflow">
          <p className="mb-3 text-sm text-muted">Allowed next statuses from <strong>{STATUS_LABELS[p.status]}</strong>. Fully Funded only means the target was reached — Completed requires an outcome and completion date.</p>
          <div className="flex flex-wrap gap-2">
            {(TRANSITIONS[p.status] ?? []).map((s) => (
              <form key={s} action={setProjectStatus}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="status" value={s} />
                <SubmitButton variant="outline" size="sm" confirm={`Change status to ${STATUS_LABELS[s]}?`}>{STATUS_LABELS[s]}</SubmitButton>
              </form>
            ))}
            {!TRANSITIONS[p.status]?.length && <p className="text-sm text-muted">No further transitions.</p>}
          </div>
        </Section>

        <Section title="Verification">
          <KV rows={[
            ["Status", p.verificationStatus],
            ["Date", date(p.verificationDate)],
            ["Team", p.verificationTeam || "—"],
            ["Site visit", p.siteVisit || "—"],
            ["Summary", p.verificationSummary || "—"],
            ["Created by", creator?.user?.name ?? "Seed / unknown"],
          ]} />
          {can(user.role, "project.approve") && p.verificationStatus !== "VERIFIED" && (
            <div className="mt-4 flex gap-2">
              {creator?.userId === user.id ? (
                <p className="text-sm text-amber-700">You created this project, so another verification officer must approve it.</p>
              ) : (
                <>
                  <form action={approveVerification}>
                    <input type="hidden" name="id" value={id} /><input type="hidden" name="decision" value="VERIFIED" />
                    <SubmitButton size="sm" confirm="Approve verification for this project?">Approve verification</SubmitButton>
                  </form>
                  <form action={approveVerification}>
                    <input type="hidden" name="id" value={id} /><input type="hidden" name="decision" value="REJECTED" />
                    <SubmitButton size="sm" variant="danger" confirm="Reject this project's verification?">Reject</SubmitButton>
                  </form>
                </>
              )}
            </div>
          )}
        </Section>
      </div>

      <Section title="Budget items & sponsorship">
        <div className="overflow-x-auto">
          <table className={table}>
            <thead><tr><th className={th}>Item</th><th className={`${th} text-right`}>Qty</th><th className={`${th} text-right`}>Funded</th><th className={`${th} text-right`}>Remaining</th><th className={`${th} text-right`}>Unit</th><th className={`${th} text-right`}>Total</th></tr></thead>
            <tbody className={tbody}>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className={td}>{i.name}{!i.sponsorable && <span className="ml-2 text-xs text-muted">(not sponsorable)</span>}</td>
                  <td className={`${td} font-num text-right`}>{i.quantity}</td>
                  <td className={`${td} font-num text-right`}>{i.fundedQty}</td>
                  <td className={`${td} font-num text-right`}>{i.quantity - i.fundedQty}</td>
                  <td className={`${td} font-num text-right`}>{usd(i.unitCents)}</td>
                  <td className={`${td} font-num text-right`}>{usd(i.unitCents * i.quantity)}</td>
                </tr>
              ))}
              {!items.length && <tr><td className={td} colSpan={6}>No itemised budget.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="Timeline">
          <ol className="space-y-2">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm dark:border-[#24384a]">
                <span className={m.done ? "text-navy dark:text-slate-100" : "text-muted"}>{m.done ? "✓" : "○"} {m.title} <span className="text-xs text-muted">{date(m.date)}</span></span>
                {can(user.role, "project.edit") && (
                  <form action={toggleMilestone}>
                    <input type="hidden" name="id" value={m.id} /><input type="hidden" name="back" value={back} />
                    <SubmitButton size="sm" variant="quiet">{m.done ? "Undo" : "Mark done"}</SubmitButton>
                  </form>
                )}
              </li>
            ))}
            {!milestones.length && <p className="text-sm text-muted">No milestones.</p>}
          </ol>
        </Section>

        <Section title="Recent donations" actions={<Link href={`/admin/donations?project=${id}`} className={link}>All</Link>}>
          <ul className="divide-y divide-line text-sm dark:divide-[#24384a]">
            {recent.map((r) => (
              <li key={r.id} className="flex justify-between py-2">
                <span><Link className={link} href={`/admin/donations/${r.id}`}>{r.reference}</Link> <span className="text-muted">{r.donor.fullName}</span></span>
                <span className="flex items-center gap-2"><span className="font-num">{usd(r.amountCents)}</span><StatusPill status={r.status} /></span>
              </li>
            ))}
            {!recent.length && <li className="py-2 text-muted">No donations yet.</li>}
          </ul>
        </Section>
      </div>

      <Section title="Project updates" className="scroll-mt-24">
        <div id="updates" />
        {can(user.role, "project.edit") && (
          <form action={postUpdate} className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input type="hidden" name="projectId" value={id} />
            <div><label className="label" htmlFor="u-title">Update title</label><input id="u-title" name="title" required className="field" /></div>
            <div>
              <label className="label" htmlFor="u-ms">Milestone status</label>
              <select id="u-ms" name="milestone" className="field">
                <option value="">—</option>
                {milestones.map((m) => <option key={m.id} value={m.title}>{m.title}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><label className="label" htmlFor="u-body">Description (include financial progress where relevant)</label><textarea id="u-body" name="body" rows={4} required className="field" /></div>
            <div>
              <label className="label" htmlFor="u-img">Photo</label>
              <select id="u-img" name="image" className="field">
                <option value="">No photo</option>
                {photos.map((ph) => <option key={ph} value={ph}>{ph.split("/").pop()}</option>)}
              </select>
            </div>
            <div className="flex items-end"><SubmitButton>Publish update & notify supporters</SubmitButton></div>
          </form>
        )}
        <ul className="space-y-3">
          {updates.map((u) => (
            <li key={u.id} className="rounded-xl border border-line p-4 dark:border-[#24384a]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{u.title}</p>
                  <p className="text-xs text-muted">{date(u.createdAt)} {u.milestone && `· ${u.milestone}`}</p>
                </div>
                {can(user.role, "project.edit") && (
                  <form action={deleteUpdate}>
                    <input type="hidden" name="id" value={u.id} />
                    <SubmitButton size="sm" variant="quiet" confirm="Delete this update?">Delete</SubmitButton>
                  </form>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{u.body}</p>
            </li>
          ))}
          {!updates.length && <p className="text-sm text-muted">No updates yet.</p>}
        </ul>
      </Section>
    </div>
  );
}
