import Link from "next/link";
import { LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { ProjectCard } from "./project-card";
import { Container, EmptyState, btn } from "./ui";
import { getProjects, publicWhere, PUBLIC_STATUSES } from "@/lib/queries";
import { db } from "@/lib/db";
import { cn } from "@/lib/format";

export type BrowserParams = Record<string, string | undefined>;

const FUNDING = [
  ["", "Any funding status"],
  ["fundraising", "Fundraising"],
  ["nearly", "Nearly funded (75%+)"],
  ["funded", "Fully funded"],
  ["completed", "Completed"],
];
const SORTS = [
  ["newest", "Newest"],
  ["urgent", "Most urgent"],
  ["nearly", "Nearly funded"],
  ["remaining-desc", "Most remaining"],
  ["remaining-asc", "Least remaining"],
  ["goal-desc", "Largest goal"],
  ["deadline", "Deadline soonest"],
];
const AMOUNT_BANDS = [
  ["", "Any amount"],
  ["0-2500", "Under $2,500"],
  ["2500-7500", "$2,500 – $7,500"],
  ["7500-", "Over $7,500"],
];

export async function ProjectBrowser({ params, preset, basePath }: { params: BrowserParams; preset?: "urgent" | "completed"; basePath: string }) {
  const q = params.q?.trim();
  const where: Prisma.ProjectWhereInput = { isPublic: true, status: { in: PUBLIC_STATUSES } };
  if (params.category) where.category = { slug: params.category };
  if (params.district) where.district = params.district;
  if (params.priority) where.priority = params.priority;
  if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { location: { contains: q, mode: "insensitive" } }, { shortDescription: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }];
  if (preset === "urgent") {
    where.status = "FUNDRAISING";
    where.priority = { in: ["URGENT", "HIGH"] };
  }
  if (preset === "completed") where.status = "COMPLETED";

  const [all, categories, districts] = await Promise.all([
    getProjects({ AND: [publicWhere(), where] }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.project.findMany({ where: { isPublic: true }, distinct: ["district"], select: { district: true }, orderBy: { district: "asc" } }),
  ]);

  let projects = all;
  const funding = params.funding;
  if (funding === "fundraising") projects = projects.filter((p) => p.status === "FUNDRAISING");
  if (funding === "nearly") projects = projects.filter((p) => p.status === "FUNDRAISING" && p.finance.percent >= 75);
  if (funding === "funded") projects = projects.filter((p) => p.status === "FULLY_FUNDED" || p.status === "IN_PROGRESS");
  if (funding === "completed") projects = projects.filter((p) => p.status === "COMPLETED");
  if (params.amount) {
    const [min, max] = params.amount.split("-").map((v) => (v ? Number(v) * 100 : undefined));
    projects = projects.filter((p) => (min === undefined || p.goalCents >= min) && (max === undefined || p.goalCents < max));
  }
  if (params.minpct) projects = projects.filter((p) => p.finance.percent >= Number(params.minpct));

  const sort = params.sort ?? (preset === "urgent" ? "deadline" : "newest");
  const urgency = (p: (typeof projects)[number]) => (p.priority === "URGENT" ? 0 : p.priority === "HIGH" ? 1 : 2);
  projects = [...projects].sort((a, b) => {
    switch (sort) {
      case "urgent": return urgency(a) - urgency(b) || (a.deadline?.getTime() ?? Infinity) - (b.deadline?.getTime() ?? Infinity);
      case "nearly": return b.finance.percent - a.finance.percent;
      case "remaining-desc": return b.finance.remainingGross - a.finance.remainingGross;
      case "remaining-asc": return a.finance.remainingGross - b.finance.remainingGross;
      case "goal-desc": return b.goalCents - a.goalCents;
      case "deadline": return (a.deadline?.getTime() ?? Infinity) - (b.deadline?.getTime() ?? Infinity);
      default: return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
    }
  });

  const view = params.view === "list" ? "list" : "grid";
  const qs = (patch: BrowserParams) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...patch })) if (v) next.set(k, v);
    const s = next.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const activeFilters = ["q", "category", "district", "priority", "funding", "amount", "minpct"].filter((k) => params[k]);

  return (
    <Container className="py-12">
      <form method="get" action={basePath} className="rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <input type="hidden" name="view" value={view} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <label htmlFor="q" className="sr-only">Search projects</label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input id="q" name="q" defaultValue={q} placeholder="Search by name, place or project ID" className="field pl-10" />
          </div>
          <Select name="category" label="Category" value={params.category} options={[["", "All categories"], ...categories.map((c) => [c.slug, c.name])]} />
          <Select name="district" label="District" value={params.district} options={[["", "All districts"], ...districts.map((d) => [d.district, d.district])]} />
          {!preset && <Select name="funding" label="Funding status" value={funding} options={FUNDING} />}
          {!preset && <Select name="priority" label="Priority" value={params.priority} options={[["", "Any priority"], ["URGENT", "Urgent"], ["HIGH", "High"], ["NORMAL", "Normal"]]} />}
          <Select name="amount" label="Required amount" value={params.amount} options={AMOUNT_BANDS} />
          <Select name="minpct" label="Funding percentage" value={params.minpct} options={[["", "Any % funded"], ["25", "25%+ funded"], ["50", "50%+ funded"], ["75", "75%+ funded"]]} />
          <Select name="sort" label="Sort" value={sort} options={SORTS} />
          <div className="flex gap-2 lg:col-span-1">
            <button className={btn("primary", "md", "flex-1")}><SlidersHorizontal className="size-4" /> Apply</button>
          </div>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          <span className="font-semibold text-navy">{projects.length}</span> {projects.length === 1 ? "project" : "projects"}
          {activeFilters.length > 0 && <> · <Link href={basePath} className="font-semibold text-forest hover:underline">Clear filters</Link></>}
        </p>
        <div className="flex rounded-full border border-line bg-white p-1" role="group" aria-label="Layout">
          <Link href={qs({ view: "grid" })} aria-current={view === "grid"} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold", view === "grid" ? "bg-forest text-white" : "text-muted")}>
            <LayoutGrid className="size-4" /> Grid
          </Link>
          <Link href={qs({ view: "list" })} aria-current={view === "list"} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold", view === "list" ? "bg-forest text-white" : "text-muted")}>
            <List className="size-4" /> List
          </Link>
        </div>
      </div>

      <div className={cn("mt-6 grid gap-6", view === "grid" ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
        {projects.map((p) => <ProjectCard key={p.id} p={p} layout={view} />)}
      </div>
      {projects.length === 0 && (
        <div className="mt-6">
          <EmptyState title="No projects match these filters" body="Try removing a filter or searching for a different place." action={<Link href={basePath} className={btn("outline")}>Clear filters</Link>} />
        </div>
      )}
    </Container>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value?: string; options: string[][] }) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className="sr-only">{label}</label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ""} className="field cursor-pointer">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
