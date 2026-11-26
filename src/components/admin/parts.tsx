import Link from "next/link";
import { cn } from "@/lib/format";
import { card, h1, muted } from "./styles";

export function PageHeader({ title, intro, actions }: { title: string; intro?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className={h1}>{title}</h1>
        {intro && <p className={cn(muted, "mt-1 max-w-3xl")}>{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "good" | "warn" | "bad" | "gold" }) {
  return (
    <div className={cn(card, "p-4")}>
      <p className="text-xs font-medium text-muted dark:text-slate-400">{label}</p>
      <p
        className={cn(
          "font-num mt-1 text-xl font-bold sm:text-2xl",
          tone === "good" && "text-success",
          tone === "warn" && "text-amber-600",
          tone === "bad" && "text-urgent",
          tone === "gold" && "text-[#b7832a]",
          !tone && "text-navy dark:text-white",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Section({ title, children, actions, className }: { title: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={cn(card, "p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-navy dark:text-white">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** GET filter bar. Children are inputs/selects with `name` attributes. */
export function Filters({ children, action }: { children: React.ReactNode; action?: string }) {
  return (
    <form action={action} method="get" className={cn(card, "mb-4 flex flex-wrap items-end gap-3 p-4")}>
      {children}
      <button className="h-10 rounded-full bg-forest px-5 text-sm font-semibold text-white hover:bg-forest-deep">Apply</button>
      {action && <Link href={action} className="h-10 px-2 text-sm leading-10 text-muted hover:text-forest">Reset</Link>}
    </form>
  );
}

export function Select({ name, label, value, options, className }: { name: string; label: string; value?: string; options: [string, string][]; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={`f-${name}`} className="label">{label}</label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ""} className="field h-10 !py-1.5 text-sm">
        <option value="">All</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

export function TextFilter({ name, label, value, type = "text", placeholder }: { name: string; label: string; value?: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className="label">{label}</label>
      <input id={`f-${name}`} name={name} type={type} defaultValue={value ?? ""} placeholder={placeholder} className="field h-10 !py-1.5 text-sm" />
    </div>
  );
}

export function Pagination({ page, total, size, sp, base }: { page: number; total: number; size: number; sp: Record<string, string | undefined>; base: string }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return <p className="mt-3 text-xs text-muted">{total} record{total === 1 ? "" : "s"}</p>;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page" && k !== "ok" && k !== "err") as [string, string][]);
    q.set("page", String(p));
    return `${base}?${q}`;
  };
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <p className="text-xs text-muted">{total} records · page {page} of {pages}</p>
      <div className="flex gap-2">
        {page > 1 && <Link className="rounded-full border border-line px-3 py-1 hover:bg-forest-50 dark:border-[#24384a]" href={href(page - 1)}>Previous</Link>}
        {page < pages && <Link className="rounded-full border border-line px-3 py-1 hover:bg-forest-50 dark:border-[#24384a]" href={href(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted dark:border-[#24384a]">{children}</p>;
}

export function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="font-medium text-navy dark:text-slate-100">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
