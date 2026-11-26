import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { CONFIRMED_STATUSES, projectFinance, sumDonations, sumExpenses, type ProjectFinance } from "./finance";

export const PUBLIC_STATUSES = ["FUNDRAISING", "FULLY_FUNDED", "IN_PROGRESS", "COMPLETED"];
export const ACTIVE_STATUSES = ["FUNDRAISING", "FULLY_FUNDED", "IN_PROGRESS"];

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_VERIFICATION: "Pending Verification",
  APPROVED: "Approved",
  FUNDRAISING: "Fundraising Active",
  FULLY_FUNDED: "Fully Funded",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
  CLOSED: "Closed",
};

const donationSelect = { amountCents: true, feeCents: true, refundedCents: true, status: true, donorId: true } as const;

export type ProjectCardData = Awaited<ReturnType<typeof getProjects>>[number];

export async function getProjects(where: Prisma.ProjectWhereInput = {}, orderBy: Prisma.ProjectOrderByWithRelationInput[] = [{ publishedAt: "desc" }]) {
  const projects = await db.project.findMany({
    where,
    orderBy,
    include: {
      category: true,
      donations: { where: { status: { in: [...CONFIRMED_STATUSES] } }, select: donationSelect },
      expenses: { select: { amountCents: true, status: true } },
    },
  });
  return projects.map(({ donations, expenses, ...p }) => ({
    ...p,
    finance: projectFinance(p, donations, expenses),
    donorCount: new Set(donations.filter((d) => d.status !== "CHARGEBACK").map((d) => d.donorId)).size,
  }));
}

/** Public = visible, in a public status, and not scheduled for a future publish date. */
export function publicWhere(): Prisma.ProjectWhereInput {
  return {
    isPublic: true,
    status: { in: PUBLIC_STATUSES },
    OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
  };
}

export async function getPublicProjects(where: Prisma.ProjectWhereInput = {}) {
  return getProjects({ AND: [publicWhere(), where] });
}

export async function getProjectBySlug(slug: string) {
  const project = await db.project.findUnique({
    where: { slug },
    include: {
      category: true,
      budgetItems: { orderBy: { sortOrder: "asc" }, include: { donations: { where: { status: { in: [...CONFIRMED_STATUSES] } }, select: donationSelect } } },
      media: { orderBy: { sortOrder: "asc" } },
      milestones: { orderBy: { sortOrder: "asc" } },
      updates: { orderBy: { createdAt: "desc" } },
      documents: { where: { isPublic: true } },
      expenses: { where: { status: { in: ["APPROVED", "PAID"] } }, orderBy: { date: "desc" }, include: { milestone: true } },
      donations: { where: { status: { in: [...CONFIRMED_STATUSES] } }, select: donationSelect },
    },
  });
  if (!project) return null;
  const allExpenses = await db.expense.findMany({ where: { projectId: project.id }, select: { amountCents: true, status: true } });
  return {
    ...project,
    finance: projectFinance(project, project.donations, allExpenses),
    donorCount: new Set(project.donations.filter((d) => d.status !== "CHARGEBACK").map((d) => d.donorId)).size,
  };
}

/** Public donor list for a project — never exposes email, phone or payment identifiers. */
export async function getPublicDonations(opts: { projectId?: string; take?: number; skip?: number; sort?: "latest" | "highest"; q?: string } = {}) {
  const where: Prisma.DonationWhereInput = {
    status: { in: ["PAID", "PARTIALLY_REFUNDED"] },
    ...(opts.projectId ? { projectId: opts.projectId } : {}),
    ...(opts.q ? { donor: { fullName: { contains: opts.q, mode: "insensitive" } }, anonymous: false, showName: true } : {}),
  };
  const [rows, count, agg] = await Promise.all([
    db.donation.findMany({
      where,
      orderBy: opts.sort === "highest" ? [{ amountCents: "desc" }] : [{ confirmedAt: "desc" }],
      take: opts.take ?? 10,
      skip: opts.skip ?? 0,
      select: {
        id: true, amountCents: true, refundedCents: true, confirmedAt: true, anonymous: true, showName: true,
        message: true, messageApproved: true, isDemo: true,
        donor: { select: { fullName: true, companyName: true, country: true, donorType: true } },
        project: { select: { title: true, slug: true } },
      },
    }),
    db.donation.count({ where }),
    db.donation.aggregate({ where, _sum: { amountCents: true, refundedCents: true } }),
  ]);
  return {
    count,
    totalCents: (agg._sum.amountCents ?? 0) - (agg._sum.refundedCents ?? 0),
    rows: rows.map((r) => {
      const hidden = r.anonymous || !r.showName;
      return {
        id: r.id,
        name: hidden ? "Anonymous" : r.donor.donorType === "INDIVIDUAL" ? r.donor.fullName : (r.donor.companyName ?? r.donor.fullName),
        country: r.donor.country,
        donorType: r.donor.donorType,
        amountCents: r.amountCents - r.refundedCents,
        date: r.confirmedAt,
        message: r.messageApproved ? r.message : "",
        project: r.project,
        isDemo: r.isDemo,
      };
    }),
  };
}

export async function getSettings() {
  const rows = await db.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
}

export type SiteStats = {
  gross: number; grossReceived: number; refunds: number; fees: number; net: number;
  required: number; remaining: number; donors: number; activeProjects: number; completedProjects: number;
  families: number; schools: number; children: number; countries: number;
  projectExpenses: number; adminExpenses: number; commitments: number; available: number;
};

/** Organisation-wide totals. Everything derives from the same tables as project pages. */
export async function getSiteStats(): Promise<SiteStats> {
  const [donations, expenses, projects, donorCount, countries] = await Promise.all([
    db.donation.findMany({ where: { status: { in: [...CONFIRMED_STATUSES] } }, select: donationSelect }),
    db.expense.findMany({ select: { amountCents: true, status: true, administrative: true } }),
    getPublicProjects(),
    db.donation.findMany({ where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] } }, distinct: ["donorId"], select: { donorId: true } }),
    db.donor.findMany({ where: { donations: { some: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] } } } }, distinct: ["country"], select: { country: true } }),
  ]);
  const d = sumDonations(donations);
  const proj = sumExpenses(expenses.filter((e) => !e.administrative));
  const adm = sumExpenses(expenses.filter((e) => e.administrative));
  const fundraising = projects.filter((p) => p.status !== "COMPLETED");
  const schoolCat = projects.filter((p) => p.category.slug === "school-development" || p.category.slug === "childrens-education");
  return {
    gross: d.gross,
    grossReceived: d.grossReceived,
    refunds: d.refunds,
    fees: d.fees,
    net: d.net,
    required: fundraising.reduce((s, p) => s + p.goalCents, 0),
    remaining: fundraising.reduce((s, p) => s + p.finance.remainingGross, 0),
    donors: donorCount.length,
    activeProjects: projects.filter((p) => ACTIVE_STATUSES.includes(p.status)).length,
    completedProjects: projects.filter((p) => p.status === "COMPLETED").length,
    families: projects.reduce((s, p) => s + p.families, 0),
    schools: schoolCat.length,
    children: projects.reduce((s, p) => s + p.children, 0),
    countries: countries.length,
    projectExpenses: proj.paid,
    adminExpenses: adm.paid,
    commitments: proj.committed + adm.committed,
    available: d.net - proj.paid - adm.paid,
  };
}

export type { ProjectFinance };
