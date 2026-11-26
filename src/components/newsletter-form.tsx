"use client";

import { useActionState } from "react";
import { subscribe } from "@/app/actions/public";

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribe, null);
  return (
    <form action={action} className="mt-4">
      <div className="flex gap-2">
        <label htmlFor="nl-email" className="sr-only">Email address</label>
        <input id="nl-email" name="email" type="email" required placeholder="you@example.com" className="h-11 min-w-0 flex-1 rounded-full border border-white/20 bg-white/5 px-4 text-sm text-white placeholder:text-white/40 focus:border-gold focus:outline-none" />
        <button disabled={pending} className="h-11 rounded-full bg-gold px-5 text-sm font-semibold text-forest-deep hover:brightness-95 disabled:opacity-60">
          {pending ? "…" : "Subscribe"}
        </button>
      </div>
      {state && <p role="status" className={state.ok ? "mt-2 text-sm text-gold" : "mt-2 text-sm text-rose-300"}>{state.message}</p>}
    </form>
  );
}
