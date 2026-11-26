"use client";

import { useActionState } from "react";
import { sendContact } from "@/app/actions/public";
import { Field, Notice, SubmitButton } from "./forms";

export function ContactForm({ defaultSubject }: { defaultSubject?: string }) {
  const [state, action] = useActionState(sendContact, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4 rounded-[var(--radius-card)] border border-line bg-white p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" error={e.name} required><input id="name" name="name" autoComplete="name" defaultValue={state?.values?.name} className="field" /></Field>
        <Field label="Email" name="email" error={e.email} required><input id="email" name="email" type="email" autoComplete="email" defaultValue={state?.values?.email} className="field" /></Field>
        <Field label="Subject" name="subject" error={e.subject} required className="sm:col-span-2"><input id="subject" name="subject" defaultValue={state?.values?.subject ?? defaultSubject} className="field" /></Field>
        <Field label="Message" name="message" error={e.message} required className="sm:col-span-2"><textarea id="message" name="message" rows={6} defaultValue={state?.values?.message} className="field" /></Field>
      </div>
      <Notice state={state} />
      <SubmitButton pendingText="Sending…">Send message</SubmitButton>
    </form>
  );
}
