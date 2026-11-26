"use client";

import { useActionState } from "react";
import { login, register } from "@/app/actions/auth";
import { Field, Notice, SubmitButton } from "./forms";
import { COUNTRIES } from "@/lib/format";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" name="email" required>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </Field>
      <Field label="Password" name="password" required>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </Field>
      <Notice state={state} />
      <SubmitButton className="w-full" pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(register, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4">
      <Field label="Full name" name="name" error={e.name} required>
        <input id="name" name="name" autoComplete="name" defaultValue={state?.values?.name} className="field" />
      </Field>
      <Field label="Email" name="email" error={e.email} required>
        <input id="email" name="email" type="email" autoComplete="email" defaultValue={state?.values?.email} className="field" />
      </Field>
      <Field label="Country" name="country" error={e.country} required>
        <select key={state?.values?.country ?? "init"} id="country" name="country" className="field"defaultValue={state?.values?.country ?? ""}>
          <option value="">Choose…</option>
          {Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1])).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
      </Field>
      <Field label="Password" name="password" error={e.password} hint="At least 10 characters, with a letter and a number." required>
        <input id="password" name="password" type="password" autoComplete="new-password" className="field" />
      </Field>
      <Notice state={state && !state.ok ? state : null} />
      <SubmitButton className="w-full" pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}
