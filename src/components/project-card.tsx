import Link from "next/link";
import { CalendarClock, MapPin, Users } from "lucide-react";
import { ProgressBar } from "./animated";
import { DemoBadge, UrgentBadge, VerifiedBadge, btn } from "./ui";
import { daysLeft, num, usd, cn } from "@/lib/format";
import type { ProjectCardData } from "@/lib/queries";

export function ProjectCard({ p, layout = "grid" }: { p: ProjectCardData; layout?: "grid" | "list" }) {
  const f = p.finance;
  const left = daysLeft(p.deadline);
  const urgent = p.priority === "URGENT" && p.status === "FUNDRAISING";
  const funded = p.status === "FULLY_FUNDED";
  const done = p.status === "COMPLETED";
  const beneficiaries = p.directBeneficiaries;

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-soft)] transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]",
        layout === "grid" ? "flex-col" : "flex-col md:flex-row",
      )}
    >
      <Link href={`/projects/${p.slug}`} className={cn("relative block overflow-hidden", layout === "list" && "md:w-80 md:shrink-0")} tabIndex={-1} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.coverImage}
          alt=""
          loading="lazy"
          className={cn("w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]", layout === "grid" ? "aspect-[4/3]" : "aspect-[4/3] md:h-full")}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {urgent && <UrgentBadge small />}
          {p.verificationStatus === "VERIFIED" && <VerifiedBadge small />}
        </div>
        {p.isDemo && <DemoBadge className="absolute right-3 top-3" />}
        {(funded || done) && (
          <span className="absolute bottom-3 left-3 rounded-full bg-forest-deep/90 px-2.5 py-1 text-xs font-semibold text-gold">
            {done ? "Completed" : "Fully funded"}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-forest">{p.category.name}</p>
        <h3 className="mt-1.5 font-serif text-xl leading-snug text-navy">
          <Link href={`/projects/${p.slug}`} className="after:absolute after:inset-0 md:after:content-none hover:text-forest">
            {p.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{p.shortDescription}</p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{p.location}</span>
          {beneficiaries > 0 && <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden />{num(beneficiaries)} beneficiaries</span>}
          {left !== null && !done && !funded && (
            <span className={cn("inline-flex items-center gap-1", left <= 14 && "font-semibold text-urgent")}>
              <CalendarClock className="size-3.5" aria-hidden />{left > 0 ? `${left} days left` : "Deadline passed"}
            </span>
          )}
        </div>

        <div className="mt-auto pt-5">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="font-num text-lg font-bold text-navy">
              {usd(f.gross)} <span className="text-sm font-normal text-muted">of {usd(f.goal)}</span>
            </p>
            <p className="font-num text-sm font-semibold text-forest">{Math.min(f.percent, 100).toFixed(0)}%</p>
          </div>
          <ProgressBar percent={f.percent} />
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span className="font-num">{num(p.donorCount)} donors</span>
            <span className="font-num">{f.remainingGross > 0 ? `${usd(f.remainingGross)} remaining` : "Goal reached"}</span>
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
            <Link href={`/projects/${p.slug}`} className={btn("outline", "sm")}>View Project</Link>
            {p.status === "FUNDRAISING" ? (
              <Link href={`/donate?project=${p.slug}`} className={btn("primary", "sm")}>Donate Now</Link>
            ) : (
              <Link href={done ? `/projects/${p.slug}#impact` : `/donate?project=${p.slug}`} className={btn(done ? "gold" : "primary", "sm")}>
                {done ? "Impact Report" : "Support"}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
