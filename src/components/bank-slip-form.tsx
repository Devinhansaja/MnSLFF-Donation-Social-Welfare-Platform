"use client";

import { useActionState } from "react";
import { submitBankSlip } from "@/app/actions/bank";
import { Field, Notice, SubmitButton } from "./forms";

export function BankSlipForm({ reference, submitted }: { reference: string; submitted: boolean }) {
  const [state, action] = useActionState(submitBankSlip, null);
  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="reference" value={reference} />
      {submitted && !state && <Notice state={{ ok: true, message: "We've received your transfer details and will verify them shortly. You can update them below." }} />}
      <Field label="Bank transaction reference" name="bankRef" required>
        <input id="bankRef" name="bankRef" className="field" />
      </Field>
      <Field label="Payment slip (PDF, PNG or JPG, max 5 MB)" name="slip" hint="Stored privately. Only finance staff can see it.">
        <input id="slip" name="slip" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="field file:mr-3 file:rounded-full file:border-0 file:bg-forest-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-forest" />
      </Field>
      <Notice state={state} />
      <SubmitButton pendingText="Uploading…">Submit transfer details</SubmitButton>
    </form>
  );
}
