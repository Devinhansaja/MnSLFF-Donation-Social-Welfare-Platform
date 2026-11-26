"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { submitApplication } from "@/app/actions/apply";
import { Field, Notice, SubmitButton } from "./forms";
import { btn } from "./ui";

const CATS = [
  ["FAMILY", "Family assistance"], ["SCHOOL", "School development"], ["EDUCATION", "Educational assistance"], ["MEDICAL", "Medical assistance"],
  ["HOUSING", "Housing assistance"], ["EMERGENCY", "Emergency assistance"], ["OTHER", "Other humanitarian need"],
];

export function ApplyForm() {
  const [state, action] = useActionState(submitApplication, null);
  const e = state?.errors ?? {};
  const v = state?.values ?? {};

  if (state?.ok && state.reference) {
    return (
      <div className="rounded-[var(--radius-card)] border border-forest/20 bg-white p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" />
        <h2 className="mt-4 font-serif text-2xl text-navy">Application received</h2>
        <p className="mt-2 text-muted">Your reference number is</p>
        <p className="mt-1 font-mono text-2xl font-bold text-forest">{state.reference}</p>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">Please keep it safe. Our team reviews every application and may contact you to arrange a field visit.</p>
        <Link href={`/request-help/track?ref=${state.reference}`} className={btn("outline", "md", "mt-6")}>Track this application</Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6 rounded-[var(--radius-card)] border border-line bg-white p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Applicant name" name="applicantName" error={e.applicantName} required><input id="applicantName" name="applicantName" defaultValue={v.applicantName} className="field" /></Field>
        <Field label="Assistance category" name="category" error={e.category} required>
          <select key={v.category ?? "init"} id="category" name="category"defaultValue={v.category ?? "FAMILY"} className="field">{CATS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select>
        </Field>
        <Field label="Email" name="email" error={e.email} required><input id="email" name="email" type="email" defaultValue={v.email} className="field" /></Field>
        <Field label="Phone" name="phone" error={e.phone} required><input id="phone" name="phone" type="tel" defaultValue={v.phone} className="field" /></Field>
        <Field label="General location (village / town, district)" name="location" error={e.location} required hint="Please don't include a full street address." className="sm:col-span-2"><input id="location" name="location" defaultValue={v.location} className="field" /></Field>
        <Field label="Description of the current situation" name="description" error={e.description} required className="sm:col-span-2"><textarea id="description" name="description" rows={6} defaultValue={v.description} className="field" /></Field>
        <Field label="Estimated funding required (USD)" name="estimated" error={e.estimated}><input id="estimated" name="estimated" type="number" min={0} step="1" defaultValue={v.estimated} className="field" /></Field>
        <Field label="Number of beneficiaries" name="beneficiaries" error={e.beneficiaries} required><input id="beneficiaries" name="beneficiaries" type="number" min={1} defaultValue={v.beneficiaries} className="field" /></Field>
        <Field label="Recommendation (e.g. Grama Niladhari, principal, religious leader)" name="recommendation" className="sm:col-span-2"><textarea id="recommendation" name="recommendation" rows={2} defaultValue={v.recommendation} className="field" /></Field>
        <Field label="Supporting documents and photographs (up to 5 files, PDF/JPG/PNG, 5 MB each)" name="documents" hint="Stored privately and seen only by verification staff." className="sm:col-span-2">
          <input id="documents" name="documents" type="file" multiple accept=".pdf,.png,.jpg,.jpeg" className="field file:mr-3 file:rounded-full file:border-0 file:bg-forest-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-forest" />
        </Field>
      </div>
      <label className="flex items-start gap-3 rounded-xl bg-ivory p-4 text-sm">
        <input type="checkbox" name="consent" className="mt-0.5 size-4 accent-forest" />
        <span>I confirm the information is true, and I consent to MnSLFF storing it and contacting me to verify the need. I understand nothing will be published without separate consent, and children&apos;s personal details are never published. <span className="text-urgent">*</span>
          {e.consent && <span className="mt-1 block text-xs font-medium text-urgent">{e.consent}</span>}
        </span>
      </label>
      <Notice state={state && !state.ok ? state : null} />
      <SubmitButton size="lg" pendingText="Submitting…">Submit application</SubmitButton>
    </form>
  );
}
