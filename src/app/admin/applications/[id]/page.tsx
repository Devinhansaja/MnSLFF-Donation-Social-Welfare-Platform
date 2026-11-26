import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { date, usd } from "@/lib/format";
import { PageHeader, Section, KV } from "@/components/admin/parts";
import { btn } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { addApplicationNote, advanceApplication } from "@/app/actions/admin/people";
import { link } from "@/components/admin/styles";

const NEXT: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["VERIFICATION_ASSIGNED", "REJECTED"],
  VERIFICATION_ASSIGNED: ["FIELD_VERIFICATION", "REJECTED"],
  FIELD_VERIFICATION: ["APPROVED", "REJECTED"],
  APPROVED: ["PROJECT_CREATED"],
  PROJECT_CREATED: ["FUNDRAISING_STARTED"],
  REJECTED: ["UNDER_REVIEW"],
  FUNDRAISING_STARTED: [],
};
const CAT_SLUG: Record<string, string> = {
  FAMILY: "family-support", SCHOOL: "school-development", EDUCATION: "childrens-education", MEDICAL: "medical-assistance",
  HOUSING: "housing-development", EMERGENCY: "emergency-relief", OTHER: "community-development",
};

export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("view");
  const { id } = await params;
  const a = await db.application.findUnique({ where: { id } });
  if (!a) notFound();
  const [officers, cat] = await Promise.all([
    db.user.findMany({ where: { role: "VERIFICATION_OFFICER", active: true }, select: { name: true } }),
    db.category.findUnique({ where: { slug: CAT_SLUG[a.category] ?? "community-development" } }),
  ]);
  let docs: string[] = [];
  try { docs = JSON.parse(a.documents || "[]"); } catch { docs = []; }
  const reviewer = can(user.role, "application.review");
  const prefill = new URLSearchParams({
    fromApp: a.reference, title: `${a.category.charAt(0) + a.category.slice(1).toLowerCase()} assistance — ${a.location}`, location: a.location,
    district: a.location.split(",").pop()?.trim() ?? "", beneficiaries: String(a.beneficiaries), goal: String(a.estimatedCents),
    background: a.description, notes: `From application ${a.reference} (applicant: ${a.applicantName}). ${a.recommendation}`, categoryId: cat?.id ?? "",
  });

  return (
    <div className="space-y-6">
      <PageHeader title={`Application ${a.reference}`} intro={`${a.category.toLowerCase()} · received ${date(a.createdAt, "long")} · status ${a.status.replaceAll("_", " ").toLowerCase()}`} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="Applicant (private)">
          <KV rows={[
            ["Name", a.applicantName], ["Email", a.email], ["Phone", a.phone || "—"], ["General location", a.location],
            ["Estimated need", usd(a.estimatedCents)], ["Beneficiaries", a.beneficiaries], ["Consent given", a.consent ? "Yes" : "No"],
            ["Assigned officer", a.officer || "—"],
          ]} />
        </Section>
        <Section title="Situation">
          <p className="whitespace-pre-line text-sm">{a.description}</p>
          {a.recommendation && <><p className="mt-4 text-xs font-semibold uppercase text-muted">Recommendation</p><p className="text-sm">{a.recommendation}</p></>}
          <p className="mt-4 text-xs font-semibold uppercase text-muted">Supporting documents (private)</p>
          {docs.length ? (
            <ul className="text-sm">{docs.map((_, i) => <li key={i}><a className={link} href={`/api/admin/app-docs/${a.id}/${i}`} target="_blank">Document {i + 1}</a></li>)}</ul>
          ) : <p className="text-sm text-muted">None uploaded.</p>}
        </Section>
      </div>

      {reviewer && (
        <Section title="Move workflow">
          <div className="flex flex-wrap gap-4">
            {(NEXT[a.status] ?? []).map((to) => (
              <form key={to} action={advanceApplication} className="flex flex-wrap items-end gap-2 rounded-xl border border-line p-3 dark:border-[#24384a]">
                <input type="hidden" name="id" value={a.id} /><input type="hidden" name="to" value={to} />
                {to === "VERIFICATION_ASSIGNED" && (
                  <div>
                    <label className="label" htmlFor="officer">Officer</label>
                    <input id="officer" name="officer" list="officers" required className="field h-10" />
                    <datalist id="officers">{officers.map((o) => <option key={o.name} value={o.name} />)}</datalist>
                  </div>
                )}
                <div><label className="label" htmlFor={`n-${to}`}>Note{to === "REJECTED" ? " (required)" : ""}</label><input id={`n-${to}`} name="note" className="field h-10" /></div>
                <SubmitButton size="sm" variant={to === "REJECTED" ? "danger" : "primary"} confirm={`Move to ${to.replaceAll("_", " ").toLowerCase()}?`}>{to.replaceAll("_", " ").toLowerCase()}</SubmitButton>
              </form>
            ))}
            {a.status === "APPROVED" && can(user.role, "project.create") && (
              <Link href={`/admin/projects/new?${prefill}`} className={btn("gold", "sm", "self-center")}>Create project from this application →</Link>
            )}
          </div>
          {a.status === "APPROVED" && <p className="mt-3 text-xs text-muted">After saving the new project, return here and mark “project created”.</p>}
        </Section>
      )}

      <Section title="Case notes">
        <pre className="whitespace-pre-wrap font-sans text-sm">{a.notes || "No notes yet."}</pre>
        {reviewer && (
          <form action={addApplicationNote} className="mt-3 flex gap-2">
            <input type="hidden" name="id" value={a.id} />
            <input name="note" className="field h-10" placeholder="Add a note" aria-label="Note" />
            <SubmitButton size="sm">Add</SubmitButton>
          </form>
        )}
      </Section>
    </div>
  );
}
