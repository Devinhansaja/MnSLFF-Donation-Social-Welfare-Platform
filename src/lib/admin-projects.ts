import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "./db";
import type { WizardInitial } from "@/components/admin/project-wizard";

export async function listPhotos() {
  try {
    const dir = path.join(process.cwd(), "public", "images", "photos");
    const files = await fs.readdir(dir);
    return files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort().map((f) => `/images/photos/${f}`);
  } catch {
    return [];
  }
}

const d = (x: Date | null | undefined) => (x ? x.toISOString().slice(0, 10) : "");

export async function wizardInitial(id?: string, prefill: Record<string, string | undefined> = {}): Promise<WizardInitial | null> {
  if (!id) {
    return {
      values: {
        title: prefill.title ?? "", slug: "", categoryId: prefill.categoryId ?? "", shortDescription: prefill.short ?? "",
        priority: "NORMAL", status: "DRAFT", location: prefill.location ?? "", district: prefill.district ?? "",
        beneficiaryType: prefill.beneficiaryType ?? "", families: "0", children: "0", students: "0", elderly: "0",
        directBeneficiaries: prefill.beneficiaries ?? "0", indirectBeneficiaries: "0", privateNotes: prefill.notes ?? "",
        background: prefill.background ?? "", coverImage: "", manualGoal: prefill.goal ?? "0", seoTitle: "", metaDescription: "",
        verificationTeam: "", verificationSummary: "", siteVisit: "", outcome: "", impactStatement: "", finalBeneficiaries: "0",
      },
      featured: false, isPublic: false, items: [], media: [], documents: [], verificationStatus: "PENDING",
      milestones: ["Project identification", "Initial investigation", "Site visit", "Verification completed", "Budget approved", "Fundraising started",
        "Funding target reached", "Procurement started", "Project implementation", "Donation distribution", "Project completed", "Final report published"]
        .map((title) => ({ title, description: "", date: "", done: false })),
    };
  }
  const p = await db.project.findUnique({
    where: { id },
    include: { budgetItems: { orderBy: { sortOrder: "asc" } }, milestones: { orderBy: { sortOrder: "asc" } }, media: { orderBy: { sortOrder: "asc" } }, documents: true },
  });
  if (!p) return null;
  const s = (n: number) => String(n);
  return {
    id: p.id, code: p.code, verificationStatus: p.verificationStatus, featured: p.featured, isPublic: p.isPublic,
    values: {
      title: p.title, slug: p.slug, categoryId: p.categoryId, shortDescription: p.shortDescription, priority: p.priority, status: p.status,
      location: p.location, district: p.district, beneficiaryType: p.beneficiaryType, families: s(p.families), children: s(p.children),
      students: s(p.students), elderly: s(p.elderly), directBeneficiaries: s(p.directBeneficiaries), indirectBeneficiaries: s(p.indirectBeneficiaries),
      privateNotes: p.privateNotes, background: p.background, situation: p.situation, problems: p.problems, whyNeeded: p.whyNeeded,
      objectives: p.objectives, solution: p.solution, implementation: p.implementation, outcomes: p.outcomes, longTermImpact: p.longTermImpact,
      sustainability: p.sustainability, coverImage: p.coverImage, manualGoal: s(p.goalCents), startDate: d(p.startDate), deadline: d(p.deadline),
      expectedCompletion: d(p.expectedCompletion), publishedAt: d(p.publishedAt), completedAt: d(p.completedAt), verificationTeam: p.verificationTeam,
      verificationSummary: p.verificationSummary, siteVisit: p.siteVisit, verificationDate: d(p.verificationDate), outcome: p.outcome,
      impactStatement: p.impactStatement, finalBeneficiaries: s(p.finalBeneficiaries), seoTitle: p.seoTitle, metaDescription: p.metaDescription,
    },
    items: p.budgetItems.map((b) => ({ id: b.id, name: b.name, description: b.description, image: b.image ?? "", quantity: b.quantity, unitCents: b.unitCents, sponsorable: b.sponsorable, fundedQty: b.fundedQty })),
    milestones: p.milestones.map((m) => ({ id: m.id, title: m.title, description: m.description, date: d(m.date), done: m.done })),
    media: p.media.map((m) => ({ url: m.url, kind: m.kind as "IMAGE" | "VIDEO", stage: m.stage as WizardInitial["media"][number]["stage"], caption: m.caption })),
    documents: p.documents.map((x) => ({ title: x.title, url: x.url, isPublic: x.isPublic, kind: x.kind as WizardInitial["documents"][number]["kind"] })),
  };
}
