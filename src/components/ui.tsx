import Link from "next/link";
import { BadgeCheck, Flame } from "lucide-react";
import { cn } from "@/lib/format";

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-5 sm:px-8", className)}>{children}</div>;
}

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none whitespace-nowrap";
const btnVariants = {
  primary: "bg-forest text-white hover:bg-forest-deep shadow-sm",
  gold: "bg-gold text-forest-deep hover:brightness-95 shadow-sm",
  outline: "border border-forest/25 text-forest hover:border-forest hover:bg-forest-50",
  ghostLight: "border border-white/40 text-white hover:bg-white/10 backdrop-blur-sm",
  quiet: "text-forest hover:bg-forest-50",
  danger: "bg-urgent text-white hover:brightness-95",
};
const btnSizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-6 text-[0.95rem]", lg: "h-13 px-8 text-base" };

export function btn(variant: keyof typeof btnVariants = "primary", size: keyof typeof btnSizes = "md", extra?: string) {
  return cn(btnBase, btnVariants[variant], btnSizes[size], extra);
}

export function ButtonLink({
  href, variant = "primary", size = "md", className, children,
}: { href: string; variant?: keyof typeof btnVariants; size?: keyof typeof btnSizes; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={btn(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-forest", className)}>{children}</p>
  );
}

export function SectionHeading({
  eyebrow, title, intro, action, light,
}: { eyebrow?: string; title: string; intro?: string; action?: React.ReactNode; light?: boolean }) {
  return (
    <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <Eyebrow className={light ? "text-gold" : undefined}>{eyebrow}</Eyebrow>}
        <h2 className={cn("font-serif text-3xl leading-tight sm:text-4xl", light ? "text-white" : "text-navy")}>{title}</h2>
        {intro && <p className={cn("mt-3 text-base leading-relaxed", light ? "text-white/75" : "text-muted")}>{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function VerifiedBadge({ small, label = "Verified" }: { small?: boolean; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-white/95 font-semibold text-forest", small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs")}>
      <BadgeCheck className={small ? "size-3.5" : "size-4"} aria-hidden /> {label}
    </span>
  );
}

export function UrgentBadge({ small }: { small?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-urgent font-semibold text-white", small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs")}>
      <Flame className={small ? "size-3.5" : "size-4"} aria-hidden /> Urgent
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      title="Demonstration record — not a real project or donation"
      className={cn("inline-flex items-center rounded-full border border-dashed border-gold bg-gold-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-forest-deep", className)}
    >
      Demo data
    </span>
  );
}

const statusTone: Record<string, string> = {
  FUNDRAISING: "bg-forest-50 text-forest",
  FULLY_FUNDED: "bg-gold-soft text-forest-deep",
  IN_PROGRESS: "bg-sky-50 text-sky-800",
  COMPLETED: "bg-emerald-50 text-emerald-800",
  DRAFT: "bg-slate-100 text-slate-600",
  PENDING_VERIFICATION: "bg-amber-50 text-amber-800",
  APPROVED: "bg-teal-50 text-teal-800",
  ON_HOLD: "bg-orange-50 text-orange-800",
  CANCELLED: "bg-rose-50 text-rose-700",
  CLOSED: "bg-slate-100 text-slate-600",
  PAID: "bg-emerald-50 text-emerald-800",
  PENDING: "bg-amber-50 text-amber-800",
  INITIATED: "bg-slate-100 text-slate-600",
  PROCESSING: "bg-sky-50 text-sky-800",
  FAILED: "bg-rose-50 text-rose-700",
  REFUNDED: "bg-violet-50 text-violet-700",
  PARTIALLY_REFUNDED: "bg-violet-50 text-violet-700",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", statusTone[status] ?? "bg-slate-100 text-slate-700")}>
      {label ?? status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 p-10 text-center">
      <p className="font-serif text-xl text-navy">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHero({ eyebrow, title, intro, image }: { eyebrow?: string; title: string; intro?: string; image?: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-forest-deep text-white">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-deep via-forest-deep/80 to-forest-deep/40" />
      <Container className="py-16 sm:py-24">
        {eyebrow && <Eyebrow className="text-gold">{eyebrow}</Eyebrow>}
        <h1 className="max-w-3xl font-serif text-4xl leading-[1.1] sm:text-5xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-lg text-white/80">{intro}</p>}
      </Container>
    </section>
  );
}
