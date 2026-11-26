"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/account";
import { Field, Notice, SubmitButton } from "./forms";
import { COUNTRIES } from "@/lib/format";

type Donor = { fullName: string; companyName: string | null; phone: string | null; country: string; publicProfile: boolean; showTotals: boolean; notifyUpdates: boolean };

export function ProfileForm({ donor, email }: { donor: Donor; email: string }) {
  const [state, action] = useActionState(updateProfile, null);
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="fullName"><input id="fullName" name="fullName" defaultValue={donor.fullName} className="field" /></Field>
        <Field label="Email (sign-in)" name="email"><input id="email" value={email} disabled className="field opacity-70" /></Field>
        <Field label="Company (optional)" name="companyName"><input id="companyName" name="companyName" defaultValue={donor.companyName ?? ""} className="field" /></Field>
        <Field label="Phone (optional)" name="phone"><input id="phone" name="phone" defaultValue={donor.phone ?? ""} className="field" /></Field>
        <Field label="Country" name="country">
          <select id="country" name="country" defaultValue={donor.country} className="field">
            {Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1])).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </Field>
      </div>
      <fieldset className="space-y-3 rounded-xl bg-ivory p-4 text-sm">
        <legend className="mb-2 font-semibold text-navy">Privacy & notifications</legend>
        <label className="flex items-start gap-3"><input type="checkbox" name="publicProfile" defaultChecked={donor.publicProfile} className="mt-0.5 size-4 accent-forest" /> List me in the public donor directory</label>
        <label className="flex items-start gap-3"><input type="checkbox" name="showTotals" defaultChecked={donor.showTotals} className="mt-0.5 size-4 accent-forest" /> Show my total giving and supported projects on my directory profile</label>
        <label className="flex items-start gap-3"><input type="checkbox" name="notifyUpdates" defaultChecked={donor.notifyUpdates} className="mt-0.5 size-4 accent-forest" /> Email me project updates, milestones and receipts</label>
      </fieldset>
      <Notice state={state} />
      <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
    </form>
  );
}
