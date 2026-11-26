"use client";

import { useActionState, useMemo, useState } from "react";
import { Building2, CreditCard, Landmark, Lock, ShieldCheck } from "lucide-react";
import { createDonation } from "@/app/actions/donate";
import { Field, Notice, SubmitButton } from "./forms";
import { cn, COUNTRIES } from "@/lib/format";

type ProjectOpt = { slug: string; title: string; remainingCents: number };
type ItemOpt = { id: string; name: string; unitCents: number; remaining: number } | null;
type Gateway = { code: string; name: string; description: string; sandbox: boolean };

const AMOUNTS = [5, 10, 25, 50, 100, 250, 500, 1000];
const money = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);

export function DonateForm({
  projects, initialProject, item, gateways, feePercent, feeFixedCents, defaults, initialKind,
}: {
  projects: ProjectOpt[]; initialProject: string; item: ItemOpt; gateways: Gateway[]; feePercent: number; feeFixedCents: number;
  defaults: { fullName: string; email: string; country: string }; initialKind: string;
}) {
  const [state, action] = useActionState(createDonation, null);
  const [idem] = useState(() => crypto.randomUUID());
  const [project, setProject] = useState(initialProject);
  const [amount, setAmount] = useState<number | "">(item ? "" : 50);
  const [custom, setCustom] = useState("");
  const [qty, setQty] = useState(1);
  const [frequency, setFrequency] = useState<"ONE_TIME" | "MONTHLY">("ONE_TIME");
  const [cover, setCover] = useState(true);
  const [method, setMethod] = useState(gateways[0]?.code ?? "");
  const [anonymous, setAnonymous] = useState(false);
  const [donorType, setDonorType] = useState("INDIVIDUAL");
  const err = state?.errors ?? {};

  const itemActive = !!item && project === initialProject;
  const baseCents = itemActive ? item!.unitCents * qty : Math.round(Number(custom || amount || 0) * 100);
  const feeCents = useMemo(() => {
    if (!cover || method === "BANK_TRANSFER" || baseCents <= 0) return 0;
    const pct = feePercent / 100;
    return Math.ceil((baseCents + feeFixedCents) / (1 - pct)) - baseCents;
  }, [cover, method, baseCents, feePercent, feeFixedCents]);
  const total = baseCents + feeCents;
  const projectTitle = projects.find((p) => p.slug === project)?.title ?? "General Fund — where most needed";

  return (
    <form action={action} className="grid grid-cols-1 gap-8 lg:grid-cols-12" noValidate>
      <input type="hidden" name="idempotencyKey" value={idem} />
      <input type="hidden" name="frequency" value={frequency} />
      <input type="hidden" name="kind" value={itemActive ? "ITEM" : initialKind} />
      {itemActive && <input type="hidden" name="itemId" value={item!.id} />}
      <input type="hidden" name="amount" value={(baseCents / 100).toFixed(2)} />

      <div className="space-y-6 lg:col-span-7">
        {/* Step 1 — gift */}
        <fieldset className="rounded-[var(--radius-card)] border border-line bg-white p-6">
          <legend className="sr-only">Your gift</legend>
          <h2 className="font-serif text-xl text-navy">1. Your gift</h2>
          <Field label="Support" name="projectSlug" className="mt-5">
            <select id="projectSlug" name="projectSlug" className="field" value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">General Fund — where most needed</option>
              {projects.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
            </select>
          </Field>

          {!itemActive && (
            <div className="mt-5 inline-flex rounded-full bg-ivory p-1" role="radiogroup" aria-label="Frequency">
              {(["ONE_TIME", "MONTHLY"] as const).map((f) => (
                <button key={f} type="button" role="radio" aria-checked={frequency === f} onClick={() => setFrequency(f)}
                  className={cn("rounded-full px-5 py-2 text-sm font-semibold transition", frequency === f ? "bg-forest text-white shadow-sm" : "text-navy")}>
                  {f === "ONE_TIME" ? "One-time" : "Monthly"}
                </button>
              ))}
            </div>
          )}

          {itemActive ? (
            <div className="mt-5 rounded-xl border border-forest/20 bg-forest-50 p-4">
              <p className="text-sm font-semibold text-navy">Sponsoring: {item!.name}</p>
              <p className="text-xs text-muted">{money(item!.unitCents)} each · {item!.remaining} still needed</p>
              <Field label="Quantity" name="itemQty" error={err.itemQty} className="mt-3 max-w-40">
                <input id="itemQty" name="itemQty" type="number" min={1} max={item!.remaining} value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(item!.remaining, Number(e.target.value) || 1)))} className="field" />
              </Field>
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Suggested amounts">
                {AMOUNTS.map((a) => (
                  <button key={a} type="button" role="radio" aria-checked={!custom && amount === a}
                    onClick={() => { setAmount(a); setCustom(""); }}
                    className={cn("h-12 rounded-xl border text-base font-bold transition font-num", !custom && amount === a ? "border-forest bg-forest text-white" : "border-line bg-white text-navy hover:border-forest/50")}>
                    ${a.toLocaleString()}
                  </button>
                ))}
              </div>
              <Field label="Or enter a custom amount (USD)" name="custom" error={err.amount} className="mt-4">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted">$</span>
                  <input id="custom" inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="Other amount" className="field pl-8 font-num" aria-describedby={err.amount ? "custom-error" : undefined} />
                </div>
              </Field>
              {frequency === "MONTHLY" && <p className="mt-3 text-xs text-muted">Monthly gifts are charged on the same day each month. You can pause or cancel anytime from your donor portal. In sandbox mode only the first payment is simulated.</p>}
            </>
          )}
        </fieldset>

        {/* Step 2 — donor */}
        <fieldset className="rounded-[var(--radius-card)] border border-line bg-white p-6">
          <legend className="sr-only">Your details</legend>
          <h2 className="font-serif text-xl text-navy">2. Your details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Donor type" name="donorType">
              <select id="donorType" name="donorType" className="field" value={donorType} onChange={(e) => setDonorType(e.target.value)}>
                <option value="INDIVIDUAL">Individual</option>
                <option value="CORPORATE">Company / corporate</option>
                <option value="ORGANIZATION">Charity / organisation</option>
              </select>
            </Field>
            <Field label="Country" name="country" error={err.country} required>
              <select key={state?.values?.country ?? "init"} id="country" name="country" className="field"defaultValue={state?.values?.country ?? defaults.country}>
                <option value="">Choose…</option>
                {Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1])).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </Field>
            <Field label="Full name" name="fullName" error={err.fullName} required>
              <input id="fullName" name="fullName" defaultValue={state?.values?.fullName ?? defaults.fullName} autoComplete="name" className="field" />
            </Field>
            {donorType !== "INDIVIDUAL" && (
              <Field label="Company / organisation name" name="companyName">
                <input id="companyName" name="companyName" defaultValue={state?.values?.companyName} autoComplete="organization" className="field" />
              </Field>
            )}
            <Field label="Email address" name="email" error={err.email} required hint="For your receipt. Never shown publicly.">
              <input id="email" name="email" type="email" defaultValue={state?.values?.email ?? defaults.email} autoComplete="email" className="field" />
            </Field>
            <Field label="Phone (optional)" name="phone" hint="Never shown publicly.">
              <input id="phone" name="phone" defaultValue={state?.values?.phone} type="tel" autoComplete="tel" className="field" />
            </Field>
            <Field label="Message of support (optional)" name="message" className="sm:col-span-2" hint="Messages are reviewed before appearing publicly.">
              <textarea id="message" name="message" defaultValue={state?.values?.message} rows={2} maxLength={500} className="field" />
            </Field>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <label className="flex items-start gap-3"><input type="checkbox" name="anonymous" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="mt-0.5 size-4 accent-forest" /> <span>Give anonymously <span className="block text-xs text-muted">Your name will show as “Anonymous” on all public lists.</span></span></label>
            {!anonymous && <label className="flex items-start gap-3"><input type="checkbox" name="showName" defaultChecked className="mt-0.5 size-4 accent-forest" /> Show my name on the public donor list</label>}
            <label className="flex items-start gap-3"><input type="checkbox" name="updates" defaultChecked className="mt-0.5 size-4 accent-forest" /> Email me project updates and the final impact report</label>
            <label className="flex items-start gap-3"><input type="checkbox" name="terms" defaultChecked={state?.values?.terms === "on"} className="mt-0.5 size-4 accent-forest" aria-describedby={err.terms ? "terms-error" : undefined} />
              <span>I agree to the <a href="/legal/terms" target="_blank" className="font-semibold text-forest underline">terms</a>, <a href="/legal/donation-policy" target="_blank" className="font-semibold text-forest underline">donation policy</a> and <a href="/legal/privacy" target="_blank" className="font-semibold text-forest underline">privacy policy</a>. <span className="text-urgent">*</span></span>
            </label>
            {err.terms && <p id="terms-error" className="text-xs font-medium text-urgent">{err.terms}</p>}
          </div>
        </fieldset>

        {/* Step 3 — payment */}
        <fieldset className="rounded-[var(--radius-card)] border border-line bg-white p-6">
          <legend className="sr-only">Payment method</legend>
          <h2 className="font-serif text-xl text-navy">3. Payment method</h2>
          <div className="mt-5 grid gap-3">
            {gateways.map((g) => (
              <label key={g.code} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition", method === g.code ? "border-forest bg-forest-50 ring-1 ring-forest" : "border-line hover:border-forest/40")}>
                <input type="radio" name="method" value={g.code} checked={method === g.code} onChange={() => setMethod(g.code)} className="mt-1 accent-forest" />
                {g.code === "BANK_TRANSFER" ? <Landmark className="mt-0.5 size-5 text-forest" /> : g.code === "SANDBOX" ? <CreditCard className="mt-0.5 size-5 text-forest" /> : <Building2 className="mt-0.5 size-5 text-forest" />}
                <span>
                  <span className="flex items-center gap-2 font-semibold text-navy">{g.name} {g.sandbox && <span className="rounded bg-gold-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-forest-deep">Test mode</span>}</span>
                  <span className="block text-xs text-muted">{g.description}</span>
                </span>
              </label>
            ))}
          </div>
          {err.method && <p className="mt-2 text-xs font-medium text-urgent">{err.method}</p>}
        </fieldset>
      </div>

      {/* Summary */}
      <aside className="lg:col-span-5">
        <div className="sticky top-24 rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-[var(--shadow-lift)]">
          <h2 className="font-serif text-xl text-navy">Donation summary</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Project</dt><dd className="text-right font-medium">{projectTitle}</dd></div>
            {itemActive && <div className="flex justify-between gap-4"><dt className="text-muted">Item</dt><dd className="text-right font-medium">{qty} × {item!.name}</dd></div>}
            <div className="flex justify-between gap-4"><dt className="text-muted">Frequency</dt><dd className="font-medium">{frequency === "MONTHLY" && !itemActive ? "Monthly" : "One-time"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Donation</dt><dd className="font-num font-semibold">{money(baseCents)}</dd></div>
            {method !== "BANK_TRANSFER" && (
              <div className="rounded-xl bg-ivory p-3">
                <label className="flex items-start gap-3">
                  <input type="checkbox" name="coverFee" checked={cover} onChange={(e) => setCover(e.target.checked)} className="mt-0.5 size-4 accent-forest" />
                  <span className="text-xs">Add <span className="font-num font-semibold">{money(feeCents || 0)}</span> to cover card processing fees, so 100% of my gift reaches the project.</span>
                </label>
              </div>
            )}
            <div className="flex justify-between gap-4"><dt className="text-muted">Processing fee coverage</dt><dd className="font-num">{money(feeCents)}</dd></div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
              <dt className="font-semibold text-navy">Total (USD)</dt>
              <dd className="font-num text-2xl font-bold text-forest">{money(total)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-xs"><dt className="text-muted">Payment method</dt><dd>{gateways.find((g) => g.code === method)?.name ?? "—"}</dd></div>
          </dl>
          <div className="mt-5"><Notice state={state && !state.ok ? state : null} /></div>
          <SubmitButton size="lg" className="mt-4 w-full" pendingText="Securing your donation…">
            <Lock className="size-4" /> {method === "BANK_TRANSFER" ? "Continue to bank details" : `Donate ${money(total)}`}
          </SubmitButton>
          <p className="mt-4 flex items-start gap-2 text-xs text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-forest" />
            You&apos;ll pay on the provider&apos;s secure hosted page. We never see or store your card number. Your donation counts only after the provider confirms payment.
          </p>
        </div>
      </aside>
    </form>
  );
}
