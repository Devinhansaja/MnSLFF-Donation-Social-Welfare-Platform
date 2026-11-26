"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown, Loader2, Eye } from "lucide-react";
import { saveProject } from "@/app/actions/admin/projects";
import { cn } from "@/lib/format";
import { card } from "./styles";

export type WizardItem = { id?: string; name: string; description: string; image: string; quantity: number; unitCents: number; sponsorable: boolean; fundedQty?: number };
export type WizardMilestone = { id?: string; title: string; description: string; date: string; done: boolean };
export type WizardMedia = { url: string; kind: "IMAGE" | "VIDEO"; stage: "BEFORE" | "VERIFICATION" | "DURING" | "DISTRIBUTION" | "AFTER"; caption: string };
export type WizardDoc = { title: string; url: string; isPublic: boolean; kind: "SUPPORTING" | "VERIFICATION" | "REPORT" };

export type WizardInitial = {
  id?: string; code?: string;
  values: Record<string, string>;
  featured: boolean; isPublic: boolean;
  items: WizardItem[]; milestones: WizardMilestone[]; media: WizardMedia[]; documents: WizardDoc[];
  verificationStatus: string;
};

const STEPS = ["Basic information", "Beneficiaries", "Project story", "Media", "Budget", "Timeline", "Verification", "Publishing"];
const STATUSES: [string, string][] = [
  ["DRAFT", "Draft"], ["PENDING_VERIFICATION", "Pending Verification"], ["APPROVED", "Approved"], ["FUNDRAISING", "Fundraising Active"],
  ["FULLY_FUNDED", "Fully Funded"], ["IN_PROGRESS", "In Progress"], ["COMPLETED", "Completed"], ["ON_HOLD", "On Hold"], ["CANCELLED", "Cancelled"], ["CLOSED", "Closed"],
];
const STAGES = ["BEFORE", "VERIFICATION", "DURING", "DISTRIBUTION", "AFTER"] as const;

const usd = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 100);

export function ProjectWizard({ initial, categories, photos }: { initial: WizardInitial; categories: { id: string; name: string }[]; photos: string[] }) {
  const [state, action, pending] = useActionState(saveProject, null);
  const [step, setStep] = useState(0);
  const [v, setV] = useState(initial.values);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [items, setItems] = useState(initial.items);
  const [milestones, setMilestones] = useState(initial.milestones);
  const [media, setMedia] = useState(initial.media);
  const [docs, setDocs] = useState(initial.documents);
  const [preview, setPreview] = useState(false);

  const total = useMemo(() => items.reduce((s, i) => s + (i.quantity || 0) * (i.unitCents || 0), 0), [items]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.value;
    setV((o) => ({ ...o, [k]: val, ...(k === "title" && !slugTouched ? { slug: slugify(val) } : {}) }));
  };
  const inp = (k: string, label: string, opts: { type?: string; required?: boolean; hint?: string; className?: string; placeholder?: string } = {}) => (
    <div className={opts.className}>
      <label className="label" htmlFor={`w-${k}`}>{label}{opts.required && <span className="text-urgent"> *</span>}</label>
      <input id={`w-${k}`} name={k} type={opts.type ?? "text"} value={v[k] ?? ""} onChange={set(k)} placeholder={opts.placeholder} className="field" required={opts.required} />
      {opts.hint && <p className="mt-1 text-xs text-muted">{opts.hint}</p>}
    </div>
  );
  const area = (k: string, label: string, rows = 4, className?: string) => (
    <div className={className}>
      <label className="label" htmlFor={`w-${k}`}>{label}</label>
      <textarea id={`w-${k}`} name={k} rows={rows} value={v[k] ?? ""} onChange={set(k)} className="field" />
    </div>
  );

  const updItem = (i: number, patch: Partial<WizardItem>) => setItems((arr) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const updMs = (i: number, patch: Partial<WizardMilestone>) => setMilestones((arr) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = <T,>(arr: T[], i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return arr;
    const c = [...arr];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  };

  return (
    <form action={action} className="grid grid-cols-1 gap-6 lg:grid-cols-[230px_1fr]">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="milestones" value={JSON.stringify(milestones)} />
      <input type="hidden" name="media" value={JSON.stringify(media)} />
      <input type="hidden" name="documents" value={JSON.stringify(docs)} />

      <ol className={cn(card, "h-fit p-3 lg:sticky lg:top-24")}>
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm", step === i ? "bg-forest text-white" : "hover:bg-forest-50 dark:hover:bg-white/5")}
              aria-current={step === i ? "step" : undefined}
            >
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", step === i ? "bg-white text-forest" : i < step ? "bg-success text-white" : "bg-forest-100 text-forest")}>
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      <div className={cn(card, "p-6")}>
        <p className="text-xs font-semibold uppercase tracking-wider text-forest">Step {step + 1} of 8</p>
        <h2 className="mb-5 font-serif text-2xl">{STEPS[step]}</h2>

        {/* All steps stay mounted so every field is submitted; only the active one is visible. */}
        <section hidden={step !== 0} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {inp("title", "Project title", { required: true, className: "md:col-span-2" })}
          <div>
            <label className="label">Project ID</label>
            <p className="field bg-ivory font-mono text-sm">{initial.code ?? "Auto-generated on save (MNS-YYYY-NNN)"}</p>
          </div>
          <div>
            <label className="label" htmlFor="w-categoryId">Category <span className="text-urgent">*</span></label>
            <select id="w-categoryId" name="categoryId" value={v.categoryId ?? ""} onChange={set("categoryId")} className="field" required>
              <option value="">Choose…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="w-shortDescription">Short description <span className="text-urgent">*</span></label>
            <textarea id="w-shortDescription" name="shortDescription" rows={2} maxLength={300} value={v.shortDescription ?? ""} onChange={set("shortDescription")} className="field" required />
            <p className="mt-1 text-xs text-muted">{(v.shortDescription ?? "").length}/300 — shown on project cards.</p>
          </div>
          {area("background", "Detailed description / background", 5, "md:col-span-2")}
          <div>
            <label className="label" htmlFor="w-priority">Priority level</label>
            <select id="w-priority" name="priority" value={v.priority} onChange={set("priority")} className="field">
              <option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="w-status">Status</label>
            <select id="w-status" name="status" value={v.status} onChange={set("status")} className="field">
              {STATUSES.map(([s, l]) => <option key={s} value={s}>{l}</option>)}
            </select>
            <p className="mt-1 text-xs text-muted">Fully Funded means the target was reached; Completed means the work is finished and reported.</p>
          </div>
        </section>

        <section hidden={step !== 1} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {inp("beneficiaryType", "Beneficiary type", { placeholder: "e.g. Rural primary school, Family, Village", className: "md:col-span-3" })}
          {inp("location", "Location (general, public)", { required: true, className: "md:col-span-2", hint: "Village/town and district only — never a private address." })}
          {inp("district", "District", { required: true })}
          {inp("families", "Families", { type: "number" })}
          {inp("children", "Children", { type: "number" })}
          {inp("students", "Students", { type: "number" })}
          {inp("elderly", "Elderly individuals", { type: "number" })}
          {inp("directBeneficiaries", "Direct beneficiaries", { type: "number" })}
          {inp("indirectBeneficiaries", "Indirect beneficiaries", { type: "number" })}
          <div className="md:col-span-3">
            <label className="label" htmlFor="w-privateNotes">Private beneficiary records & assigned officer (admin only)</label>
            <textarea id="w-privateNotes" name="privateNotes" rows={4} value={v.privateNotes ?? ""} onChange={set("privateNotes")} className="field" />
            <p className="mt-1 text-xs text-muted">Never shown publicly. Do not store identity document numbers or medical records here; keep those in secure offline files.</p>
          </div>
        </section>

        <section hidden={step !== 2} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {area("situation", "Current situation")}
          {area("problems", "Identified problems")}
          {area("whyNeeded", "Why assistance is required")}
          {area("objectives", "Project objectives")}
          {area("solution", "Proposed solution")}
          {area("implementation", "Implementation plan")}
          {area("outcomes", "Expected outcomes")}
          {area("longTermImpact", "Long-term impact")}
          {area("sustainability", "Sustainability plan", 4, "md:col-span-2")}
        </section>

        <section hidden={step !== 3}>
          <p className="label">Cover image <span className="text-urgent">*</span></p>
          <input type="hidden" name="coverImage" value={v.coverImage ?? ""} />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
            {photos.map((p) => (
              <button type="button" key={p} onClick={() => setV((o) => ({ ...o, coverImage: p }))} className={cn("overflow-hidden rounded-lg ring-offset-2", v.coverImage === p && "ring-3 ring-forest")} aria-label={`Use ${p} as cover`} aria-pressed={v.coverImage === p}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="aspect-[4/3] w-full object-cover" />
              </button>
            ))}
          </div>
          <h3 className="mb-2 mt-6 font-semibold">Gallery, before & verification photos, videos</h3>
          <p className="mb-3 text-xs text-muted">Click a photo to add it to the gallery, then set its stage. Video URLs (YouTube/Vimeo) can be added below.</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-10">
            {photos.map((p) => (
              <button type="button" key={p} onClick={() => setMedia((m) => [...m, { url: p, kind: "IMAGE", stage: "BEFORE", caption: "" }])} className="overflow-hidden rounded-md opacity-90 hover:opacity-100" aria-label={`Add ${p} to gallery`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {media.map((m, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2 dark:border-[#24384a]">
                {m.kind === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="h-12 w-16 rounded object-cover" />
                ) : <span className="rounded bg-navy px-2 py-1 text-xs text-white">VIDEO</span>}
                <select value={m.stage} onChange={(e) => setMedia((a) => a.map((x, j) => (j === i ? { ...x, stage: e.target.value as WizardMedia["stage"] } : x)))} className="field h-9 w-40 !py-1 text-sm" aria-label="Stage">
                  {STAGES.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
                </select>
                <input value={m.caption} onChange={(e) => setMedia((a) => a.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} placeholder="Caption" className="field h-9 min-w-40 flex-1 !py-1 text-sm" aria-label="Caption" />
                <button type="button" onClick={() => setMedia((a) => a.filter((_, j) => j !== i))} className="rounded p-2 text-urgent hover:bg-rose-50" aria-label="Remove media"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
          <VideoAdder onAdd={(url) => setMedia((m) => [...m, { url, kind: "VIDEO", stage: "DURING", caption: "" }])} />
        </section>

        <section hidden={step !== 4}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="py-2 pr-2">Item</th><th className="py-2 pr-2">Description</th><th className="py-2 pr-2">Image</th>
                  <th className="py-2 pr-2">Qty</th><th className="py-2 pr-2">Unit cost (USD)</th><th className="py-2 pr-2 text-right">Total</th>
                  <th className="py-2 pr-2">Sponsorable</th><th />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-line align-top dark:border-[#24384a]">
                    <td className="py-2 pr-2"><input value={it.name} onChange={(e) => updItem(i, { name: e.target.value })} className="field h-9 min-w-36 !py-1 text-sm" aria-label="Item name" required /></td>
                    <td className="py-2 pr-2"><input value={it.description} onChange={(e) => updItem(i, { description: e.target.value })} className="field h-9 min-w-44 !py-1 text-sm" aria-label="Description" /></td>
                    <td className="py-2 pr-2">
                      <select value={it.image} onChange={(e) => updItem(i, { image: e.target.value })} className="field h-9 w-32 !py-1 text-xs" aria-label="Item image">
                        <option value="">None</option>
                        {photos.map((p) => <option key={p} value={p}>{p.split("/").pop()}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" min={it.fundedQty || 1} value={it.quantity} onChange={(e) => updItem(i, { quantity: Math.max(0, Math.floor(Number(e.target.value))) })} className="field h-9 w-20 !py-1 text-sm" aria-label="Quantity" />
                      {!!it.fundedQty && <p className="mt-1 text-[11px] text-muted">{it.fundedQty} sponsored</p>}
                    </td>
                    <td className="py-2 pr-2"><input type="number" min={0.01} step="0.01" value={it.unitCents / 100 || ""} onChange={(e) => updItem(i, { unitCents: Math.round(Number(e.target.value) * 100) })} className="field h-9 w-28 !py-1 text-sm" aria-label="Unit cost" /></td>
                    <td className="font-num py-2 pr-2 text-right font-semibold">{usd((it.quantity || 0) * (it.unitCents || 0))}</td>
                    <td className="py-2 pr-2 text-center"><input type="checkbox" checked={it.sponsorable} onChange={(e) => updItem(i, { sponsorable: e.target.checked })} aria-label="Sponsorable" className="size-4 accent-forest" /></td>
                    <td className="py-2">
                      <div className="flex">
                        <button type="button" onClick={() => setItems((a) => move(a, i, -1))} className="p-1.5 text-muted" aria-label="Move up"><ArrowUp className="size-4" /></button>
                        <button type="button" onClick={() => setItems((a) => move(a, i, 1))} className="p-1.5 text-muted" aria-label="Move down"><ArrowDown className="size-4" /></button>
                        <button type="button" disabled={!!it.fundedQty} onClick={() => setItems((a) => a.filter((_, j) => j !== i))} className="p-1.5 text-urgent disabled:opacity-30" aria-label="Remove item" title={it.fundedQty ? "Sponsored items cannot be removed" : "Remove"}><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-navy/20">
                  <td colSpan={5} className="py-3 text-right font-semibold">Total budget (fundraising target)</td>
                  <td className="font-num py-3 text-right text-lg font-bold text-forest">{usd(total)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <button type="button" onClick={() => setItems((a) => [...a, { name: "", description: "", image: "", quantity: 1, unitCents: 0, sponsorable: true }])} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-forest/30 px-4 py-2 text-sm font-semibold text-forest hover:bg-forest-50">
            <Plus className="size-4" /> Add budget item
          </button>
          {items.length === 0 && (
            <div className="mt-5 max-w-xs">
              <label className="label" htmlFor="w-manualGoal">Funding target without itemised budget (USD)</label>
              <input id="w-manualGoal" type="number" min={0} step="0.01" value={Number(v.manualGoal || 0) / 100 || ""} onChange={(e) => setV((o) => ({ ...o, manualGoal: String(Math.round(Number(e.target.value) * 100)) }))} className="field" />
            </div>
          )}
          <input type="hidden" name="manualGoal" value={v.manualGoal ?? "0"} />
        </section>

        <section hidden={step !== 5}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {inp("startDate", "Start date", { type: "date" })}
            {inp("deadline", "Fundraising deadline", { type: "date" })}
            {inp("expectedCompletion", "Expected completion date", { type: "date" })}
          </div>
          <h3 className="mb-2 mt-6 font-semibold">Project milestones</h3>
          <ul className="space-y-2">
            {milestones.map((m, i) => (
              <li key={i} className="grid grid-cols-1 gap-2 rounded-xl border border-line p-3 md:grid-cols-[1fr_1.4fr_150px_auto_auto] md:items-center dark:border-[#24384a]">
                <input value={m.title} onChange={(e) => updMs(i, { title: e.target.value })} className="field h-9 !py-1 text-sm" placeholder="Milestone" aria-label="Milestone title" required />
                <input value={m.description} onChange={(e) => updMs(i, { description: e.target.value })} className="field h-9 !py-1 text-sm" placeholder="Description" aria-label="Milestone description" />
                <input type="date" value={m.date} onChange={(e) => updMs(i, { date: e.target.value })} className="field h-9 !py-1 text-sm" aria-label="Milestone date" />
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={m.done} onChange={(e) => updMs(i, { done: e.target.checked })} className="size-4 accent-forest" /> Done</label>
                <div className="flex">
                  <button type="button" onClick={() => setMilestones((a) => move(a, i, -1))} className="p-1.5 text-muted" aria-label="Move up"><ArrowUp className="size-4" /></button>
                  <button type="button" onClick={() => setMilestones((a) => move(a, i, 1))} className="p-1.5 text-muted" aria-label="Move down"><ArrowDown className="size-4" /></button>
                  <button type="button" onClick={() => setMilestones((a) => a.filter((_, j) => j !== i))} className="p-1.5 text-urgent" aria-label="Remove milestone"><Trash2 className="size-4" /></button>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setMilestones((a) => [...a, { title: "", description: "", date: "", done: false }])} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-forest/30 px-4 py-2 text-sm font-semibold text-forest hover:bg-forest-50">
            <Plus className="size-4" /> Add milestone
          </button>
        </section>

        <section hidden={step !== 6} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2 rounded-xl bg-ivory p-4 text-sm dark:bg-white/5">
            Approval status: <strong>{initial.verificationStatus}</strong>. Approval is recorded separately on the project page by a Verification Officer who did not create this project.
          </div>
          {inp("verificationTeam", "Responsible verification team")}
          {inp("verificationDate", "Verification date", { type: "date" })}
          {area("siteVisit", "Site visit records", 4)}
          {area("verificationSummary", "Verification notes / public summary", 4)}
          <div className="md:col-span-2">
            <h3 className="mb-2 font-semibold">Supporting documents</h3>
            <ul className="space-y-2">
              {docs.map((d, i) => (
                <li key={i} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_150px_auto_auto] md:items-center">
                  <input value={d.title} onChange={(e) => setDocs((a) => a.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} className="field h-9 !py-1 text-sm" placeholder="Title" aria-label="Document title" />
                  <input value={d.url} onChange={(e) => setDocs((a) => a.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} className="field h-9 !py-1 text-sm" placeholder="Secure file URL" aria-label="Document URL" />
                  <select value={d.kind} onChange={(e) => setDocs((a) => a.map((x, j) => (j === i ? { ...x, kind: e.target.value as WizardDoc["kind"] } : x)))} className="field h-9 !py-1 text-sm" aria-label="Document type">
                    <option value="SUPPORTING">Supporting</option><option value="VERIFICATION">Verification</option><option value="REPORT">Report</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={d.isPublic} onChange={(e) => setDocs((a) => a.map((x, j) => (j === i ? { ...x, isPublic: e.target.checked } : x)))} className="size-4 accent-forest" /> Public</label>
                  <button type="button" onClick={() => setDocs((a) => a.filter((_, j) => j !== i))} className="p-1.5 text-urgent" aria-label="Remove document"><Trash2 className="size-4" /></button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setDocs((a) => [...a, { title: "", url: "", isPublic: false, kind: "SUPPORTING" }])} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-forest/30 px-4 py-2 text-sm font-semibold text-forest hover:bg-forest-50">
              <Plus className="size-4" /> Add document
            </button>
            <p className="mt-2 text-xs text-muted">Only documents marked Public appear on the project page. Verification documents should stay private.</p>
          </div>
        </section>

        <section hidden={step !== 7} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label" htmlFor="w-slug">Custom project URL <span className="text-urgent">*</span></label>
            <div className="flex items-center gap-1 text-sm text-muted">
              /projects/
              <input id="w-slug" name="slug" value={v.slug ?? ""} onChange={(e) => { setSlugTouched(true); setV((o) => ({ ...o, slug: slugify(e.target.value) })); }} className="field" required />
            </div>
          </div>
          {inp("seoTitle", "SEO title", { hint: `${(v.seoTitle ?? "").length}/70` })}
          {inp("publishedAt", "Publish date (schedule)", { type: "date", hint: "Leave empty to publish immediately when status is Fundraising." })}
          <div className="md:col-span-2">
            <label className="label" htmlFor="w-metaDescription">Meta description</label>
            <textarea id="w-metaDescription" name="metaDescription" rows={2} maxLength={170} value={v.metaDescription ?? ""} onChange={set("metaDescription")} className="field" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={initial.featured} className="size-4 accent-forest" /> Featured on homepage</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublic" defaultChecked={initial.isPublic} className="size-4 accent-forest" /> Publicly visible</label>
          <p className="md:col-span-2 text-xs text-muted">Urgent setting is the Priority level in step 1. Save as Draft by leaving status on Draft; publishing requires verification and the publish permission.</p>
          <h3 className="md:col-span-2 mt-2 font-semibold">Completion report (for Completed projects)</h3>
          {inp("completedAt", "Completion date", { type: "date" })}
          {inp("finalBeneficiaries", "Final beneficiary count", { type: "number" })}
          {area("outcome", "Project outcome / achieved objectives", 3)}
          {area("impactStatement", "Final impact statement", 3)}
          <div className="md:col-span-2">
            <button type="button" onClick={() => setPreview((p) => !p)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest"><Eye className="size-4" /> {preview ? "Hide" : "Preview"} project card</button>
            {preview && (
              <div className="mt-3 max-w-sm overflow-hidden rounded-2xl border border-line bg-white text-navy">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {v.coverImage && <img src={v.coverImage} alt="" className="aspect-[4/3] w-full object-cover" />}
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase text-forest">{categories.find((c) => c.id === v.categoryId)?.name}</p>
                  <p className="font-serif text-lg">{v.title || "Untitled project"}</p>
                  <p className="mt-1 text-sm text-muted">{v.shortDescription}</p>
                  <p className="mt-3 font-semibold">$0 of {usd(total || Number(v.manualGoal || 0))}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {state && !state.ok && <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{state.message}</p>}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 dark:border-[#24384a]">
          <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-forest disabled:opacity-30">
            <ChevronLeft className="size-4" /> Back
          </button>
          <div className="flex gap-2">
            {step < 7 && (
              <button type="button" onClick={() => setStep((s) => s + 1)} className="inline-flex items-center gap-1 rounded-full border border-forest/30 px-5 py-2 text-sm font-semibold text-forest hover:bg-forest-50">
                Next <ChevronRight className="size-4" />
              </button>
            )}
            <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-2 text-sm font-semibold text-white hover:bg-forest-deep disabled:opacity-60">
              {pending && <Loader2 className="size-4 animate-spin" />} {initial.id ? "Save project" : "Create project"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function VideoAdder({ onAdd }: { onAdd: (url: string) => void }) {
  const [url, setUrl] = useState("");
  return (
    <div className="mt-4 flex gap-2">
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="field h-10 !py-1 text-sm" aria-label="Video URL" />
      <button type="button" onClick={() => { if (/^https:\/\//.test(url)) { onAdd(url); setUrl(""); } }} className="rounded-full border border-forest/30 px-4 text-sm font-semibold text-forest">Add video</button>
    </div>
  );
}
