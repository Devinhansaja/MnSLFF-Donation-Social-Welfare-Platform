import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { Container, btn } from "@/components/ui";
import { date, cn } from "@/lib/format";

export const metadata = { title: "Track your application", robots: { index: false } };

const FLOW = ["SUBMITTED", "UNDER_REVIEW", "VERIFICATION_ASSIGNED", "FIELD_VERIFICATION", "APPROVED", "PROJECT_CREATED", "FUNDRAISING_STARTED"];
const LABEL: Record<string, string> = {
  SUBMITTED: "Submitted", UNDER_REVIEW: "Under review", VERIFICATION_ASSIGNED: "Verification assigned", FIELD_VERIFICATION: "Field verification",
  APPROVED: "Approved", REJECTED: "Not approved", PROJECT_CREATED: "Project created", FUNDRAISING_STARTED: "Fundraising started",
};

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ ref?: string; email?: string }> }) {
  const { ref, email } = await searchParams;
  // Reference AND email must match, so references alone can't be enumerated.
  const app = ref && email ? await db.application.findFirst({ where: { reference: ref.trim().toUpperCase(), email: email.trim().toLowerCase() } }) : null;
  const idx = app ? FLOW.indexOf(app.status === "REJECTED" ? "FIELD_VERIFICATION" : app.status) : -1;

  return (
    <Container className="max-w-2xl py-16">
      <h1 className="font-serif text-4xl text-navy">Track your application</h1>
      <form method="get" className="mt-8 grid gap-3 rounded-[var(--radius-card)] border border-line bg-white p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div><label htmlFor="ref" className="label">Reference number</label><input id="ref" name="ref" defaultValue={ref} placeholder="APP-XXXXXXXX" className="field font-mono" required /></div>
        <div><label htmlFor="email" className="label">Email used to apply</label><input id="email" name="email" type="email" defaultValue={email} className="field" required /></div>
        <button className={btn("primary")}>Check status</button>
      </form>

      {ref && email && !app && <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">No application matches that reference and email.</p>}

      {app && (
        <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-white p-6">
          <p className="font-mono text-sm text-muted">{app.reference}</p>
          <p className="mt-1 font-serif text-2xl text-navy">{LABEL[app.status]}</p>
          <p className="text-xs text-muted">Submitted {date(app.createdAt, "long")} · last updated {date(app.updatedAt, "long")}</p>
          <ol className="mt-6 space-y-3">
            {FLOW.map((s, i) => {
              const rejectedHere = app.status === "REJECTED" && s === "APPROVED";
              const done = i <= idx && !rejectedHere;
              return (
                <li key={s} className={cn("flex items-center gap-3 text-sm", done ? "text-navy" : "text-muted")}>
                  {rejectedHere ? <XCircle className="size-5 text-urgent" /> : done ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-line" />}
                  {rejectedHere ? "Not approved" : LABEL[s]}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </Container>
  );
}
