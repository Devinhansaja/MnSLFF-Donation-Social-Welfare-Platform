"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can } from "@/lib/rbac";
import { flash, nextProjectCode, str, zodMessage } from "@/lib/admin-utils";

export type WizardState = { ok: boolean; message: string } | null;

const STATUSES = ["DRAFT", "PENDING_VERIFICATION", "APPROVED", "FUNDRAISING", "FULLY_FUNDED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED", "CLOSED"] as const;
const PUBLISHED = ["FUNDRAISING", "FULLY_FUNDED", "IN_PROGRESS", "COMPLETED"];

const itemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Budget item name is required").max(160),
  description: z.string().max(1000).default(""),
  image: z.string().max(300).optional().nullable(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unitCents: z.coerce.number().int().min(1, "Unit cost must be positive"),
  sponsorable: z.boolean().default(true),
});
const milestoneSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2000).default(""),
  date: z.string().optional().nullable(),
  done: z.boolean().default(false),
});
const mediaSchema = z.object({
  url: z.string().trim().min(1).max(400),
  kind: z.enum(["IMAGE", "VIDEO"]).default("IMAGE"),
  stage: z.enum(["BEFORE", "VERIFICATION", "DURING", "DISTRIBUTION", "AFTER"]),
  caption: z.string().max(300).default(""),
});
const docSchema = z.object({
  title: z.string().trim().min(1).max(200),
  url: z.string().trim().min(1).max(400),
  isPublic: z.boolean().default(false),
  kind: z.enum(["SUPPORTING", "VERIFICATION", "REPORT"]).default("SUPPORTING"),
});

const optDate = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Invalid date");

const projectSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "URL must be lowercase words separated by hyphens").max(120),
  categoryId: z.string().min(1, "Choose a category"),
  shortDescription: z.string().trim().min(10, "Short description is too short").max(300),
  priority: z.enum(["NORMAL", "HIGH", "URGENT"]),
  status: z.enum(STATUSES),
  location: z.string().trim().min(2, "Location is required").max(160),
  district: z.string().trim().min(2, "District is required").max(80),
  beneficiaryType: z.string().max(120).default(""),
  families: z.coerce.number().int().min(0).default(0),
  children: z.coerce.number().int().min(0).default(0),
  students: z.coerce.number().int().min(0).default(0),
  elderly: z.coerce.number().int().min(0).default(0),
  directBeneficiaries: z.coerce.number().int().min(0).default(0),
  indirectBeneficiaries: z.coerce.number().int().min(0).default(0),
  privateNotes: z.string().max(5000).default(""),
  background: z.string().max(10000).default(""),
  situation: z.string().max(10000).default(""),
  problems: z.string().max(10000).default(""),
  whyNeeded: z.string().max(10000).default(""),
  objectives: z.string().max(10000).default(""),
  solution: z.string().max(10000).default(""),
  implementation: z.string().max(10000).default(""),
  outcomes: z.string().max(10000).default(""),
  longTermImpact: z.string().max(10000).default(""),
  sustainability: z.string().max(10000).default(""),
  coverImage: z.string().trim().min(1, "Choose a cover image"),
  manualGoal: z.coerce.number().int().min(0).default(0),
  startDate: optDate,
  deadline: optDate,
  expectedCompletion: optDate,
  publishedAt: optDate,
  completedAt: optDate,
  verificationTeam: z.string().max(200).default(""),
  verificationSummary: z.string().max(5000).default(""),
  siteVisit: z.string().max(5000).default(""),
  verificationDate: optDate,
  outcome: z.string().max(5000).default(""),
  impactStatement: z.string().max(5000).default(""),
  finalBeneficiaries: z.coerce.number().int().min(0).default(0),
  featured: z.boolean(),
  isPublic: z.boolean(),
  seoTitle: z.string().max(70, "SEO title should be 70 characters or fewer").default(""),
  metaDescription: z.string().max(170, "Meta description should be 170 characters or fewer").default(""),
});

function parseJson<T>(raw: string, schema: z.ZodType<T>, label: string): T[] {
  let arr: unknown;
  try {
    arr = JSON.parse(raw || "[]");
  } catch {
    throw new Error(`${label}: invalid data`);
  }
  const res = z.array(schema).safeParse(arr);
  if (!res.success) throw new Error(`${label}: ${zodMessage(res.error)}`);
  return res.data;
}

export async function saveProject(_: WizardState, fd: FormData): Promise<WizardState> {
  const id = str(fd, "id") || null;
  const user = await requireStaff(id ? "project.edit" : "project.create");
  const raw = Object.fromEntries(fd);
  const parsed = projectSchema.safeParse({ ...raw, featured: fd.get("featured") === "on", isPublic: fd.get("isPublic") === "on" });
  if (!parsed.success) return { ok: false, message: zodMessage(parsed.error) };
  const p = parsed.data;

  let items, milestones, media, docs;
  try {
    items = parseJson(str(fd, "items"), itemSchema, "Budget");
    milestones = parseJson(str(fd, "milestones"), milestoneSchema, "Timeline");
    media = parseJson(str(fd, "media"), mediaSchema, "Media");
    docs = parseJson(str(fd, "documents"), docSchema, "Documents");
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const budgetTotal = items.reduce((s, i) => s + i.quantity * i.unitCents, 0);
  const goalCents = budgetTotal > 0 ? budgetTotal : p.manualGoal;
  if (goalCents <= 0) return { ok: false, message: "Add budget items or a funding target greater than $0." };

  const existing = id ? await db.project.findUnique({ where: { id }, include: { budgetItems: { include: { _count: { select: { donations: true } } } } } }) : null;
  if (id && !existing) return { ok: false, message: "Project not found." };

  const slugOwner = await db.project.findUnique({ where: { slug: p.slug }, select: { id: true } });
  if (slugOwner && slugOwner.id !== id) return { ok: false, message: "That project URL is already used by another project." };

  // Publishing controls
  const goingPublic = PUBLISHED.includes(p.status) || p.isPublic;
  const wasPublic = existing ? PUBLISHED.includes(existing.status) || existing.isPublic : false;
  if (goingPublic && !wasPublic && !can(user.role, "project.publish")) return { ok: false, message: "You don't have permission to publish projects." };
  const verified = existing?.verificationStatus === "VERIFIED";
  if (PUBLISHED.includes(p.status) && !verified) return { ok: false, message: "A project must be verified (Project Verification) before it can be fundraising or published." };
  if (["APPROVED"].includes(p.status) && !verified) return { ok: false, message: "Status 'Approved' requires completed verification." };
  if (p.status === "COMPLETED" && (!p.outcome.trim() || !p.completedAt)) return { ok: false, message: "To mark a project Completed, enter the project outcome and completion date (Publishing step)." };
  if (p.isPublic && !PUBLISHED.includes(p.status)) return { ok: false, message: "Public visibility is only possible for Fundraising, Fully Funded, In Progress or Completed projects." };

  // Budget item safety: never remove or shrink below sponsored quantity
  if (existing) {
    const keep = new Set(items.map((i) => i.id).filter(Boolean));
    for (const b of existing.budgetItems) {
      if (!keep.has(b.id) && (b.fundedQty > 0 || b._count.donations > 0)) {
        return { ok: false, message: `Budget item "${b.name}" has sponsorships and cannot be removed.` };
      }
      const next = items.find((i) => i.id === b.id);
      if (next && next.quantity < b.fundedQty) return { ok: false, message: `"${b.name}" quantity cannot be lower than the ${b.fundedQty} already sponsored.` };
    }
  }

  const data = {
    title: p.title, slug: p.slug, categoryId: p.categoryId, shortDescription: p.shortDescription, priority: p.priority, status: p.status,
    location: p.location, district: p.district, beneficiaryType: p.beneficiaryType, families: p.families, children: p.children,
    students: p.students, elderly: p.elderly, directBeneficiaries: p.directBeneficiaries, indirectBeneficiaries: p.indirectBeneficiaries,
    privateNotes: p.privateNotes, background: p.background, situation: p.situation, problems: p.problems, whyNeeded: p.whyNeeded,
    objectives: p.objectives, solution: p.solution, implementation: p.implementation, outcomes: p.outcomes, longTermImpact: p.longTermImpact,
    sustainability: p.sustainability, coverImage: p.coverImage, goalCents, costCents: goalCents, startDate: p.startDate, deadline: p.deadline,
    expectedCompletion: p.expectedCompletion, completedAt: p.completedAt, verificationTeam: p.verificationTeam, verificationSummary: p.verificationSummary,
    siteVisit: p.siteVisit, verificationDate: p.verificationDate, outcome: p.outcome, impactStatement: p.impactStatement,
    finalBeneficiaries: p.finalBeneficiaries, featured: p.featured, isPublic: p.isPublic, seoTitle: p.seoTitle, metaDescription: p.metaDescription,
    publishedAt: p.publishedAt ?? (goingPublic && !existing?.publishedAt ? new Date() : existing?.publishedAt ?? null),
  };

  let projectId = id;
  try {
    await db.$transaction(async (tx) => {
      if (existing) {
        await tx.project.update({ where: { id: existing.id }, data });
      } else {
        const code = await nextProjectCode();
        const created = await tx.project.create({ data: { ...data, code } });
        projectId = created.id;
      }
      const pid = projectId!;
      // Budget items
      const keepIds = items.map((i) => i.id).filter(Boolean) as string[];
      await tx.budgetItem.deleteMany({ where: { projectId: pid, id: { notIn: keepIds }, fundedQty: 0, donations: { none: {} } } });
      for (const [i, it] of items.entries()) {
        const row = { name: it.name, description: it.description, image: it.image || null, quantity: it.quantity, unitCents: it.unitCents, sponsorable: it.sponsorable, sortOrder: i };
        if (it.id && existing?.budgetItems.some((b) => b.id === it.id)) await tx.budgetItem.update({ where: { id: it.id }, data: row });
        else await tx.budgetItem.create({ data: { ...row, projectId: pid } });
      }
      // Milestones
      const keepM = milestones.map((m) => m.id).filter(Boolean) as string[];
      const removed = await tx.milestone.findMany({ where: { projectId: pid, id: { notIn: keepM } }, select: { id: true } });
      if (removed.length) {
        await tx.expense.updateMany({ where: { milestoneId: { in: removed.map((r) => r.id) } }, data: { milestoneId: null } });
        await tx.milestone.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } });
      }
      for (const [i, m] of milestones.entries()) {
        const row = { title: m.title, description: m.description, date: m.date ? new Date(m.date) : null, done: m.done, sortOrder: i };
        if (m.id) await tx.milestone.update({ where: { id: m.id }, data: row });
        else await tx.milestone.create({ data: { ...row, projectId: pid } });
      }
      // Media & documents (replace)
      await tx.media.deleteMany({ where: { projectId: pid } });
      for (const [i, m] of media.entries()) await tx.media.create({ data: { ...m, projectId: pid, sortOrder: i } });
      await tx.projectDocument.deleteMany({ where: { projectId: pid } });
      for (const d of docs) await tx.projectDocument.create({ data: { ...d, projectId: pid } });
    });
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Could not save the project. Please check the data and try again." };
  }

  await audit(user.id, existing ? "project.update" : "project.create", "project", projectId!, `${p.title} [${p.status}]`);
  if (existing && existing.status !== p.status) await audit(user.id, "project.status", "project", projectId!, `${existing.status} → ${p.status}`);
  revalidatePath("/admin/projects");
  revalidatePath("/", "layout");
  redirect(`/admin/projects/${projectId}?ok=${encodeURIComponent(existing ? "Project saved" : "Project created as " + p.status.toLowerCase())}`);
}

export async function approveVerification(fd: FormData) {
  const user = await requireStaff("project.approve");
  const id = str(fd, "id");
  const decision = str(fd, "decision") === "REJECTED" ? "REJECTED" : "VERIFIED";
  const back = `/admin/projects/${id}`;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) flash("/admin/projects", "Project not found", false);
  const creator = await db.auditLog.findFirst({ where: { entity: "project", entityId: id, action: "project.create" } });
  if (creator?.userId === user.id) flash(back, "Separation of duties: the person who created this project cannot approve its verification.", false);
  if (decision === "VERIFIED" && (!project.verificationSummary.trim() || !project.siteVisit.trim())) {
    flash(back, "Add a verification summary and site visit record before approving.", false);
  }
  await db.project.update({
    where: { id },
    data: {
      verificationStatus: decision,
      verificationDate: new Date(),
      status: decision === "VERIFIED" && ["DRAFT", "PENDING_VERIFICATION"].includes(project.status) ? "APPROVED" : project.status,
    },
  });
  if (decision === "VERIFIED") {
    await db.milestone.updateMany({ where: { projectId: id, title: "Verification completed", done: false }, data: { done: true, date: new Date() } });
  }
  await audit(user.id, `project.verification.${decision.toLowerCase()}`, "project", id, project.title);
  revalidatePath(back);
  flash(back, decision === "VERIFIED" ? "Verification approved" : "Verification rejected");
}

export async function setProjectStatus(fd: FormData) {
  const id = str(fd, "id");
  const status = str(fd, "status");
  const user = await requireStaff(PUBLISHED.includes(status) ? "project.publish" : "project.edit");
  const back = `/admin/projects/${id}`;
  if (!(STATUSES as readonly string[]).includes(status)) flash(back, "Unknown status", false);
  const project = await db.project.findUnique({ where: { id } });
  if (!project) flash("/admin/projects", "Project not found", false);
  if ((PUBLISHED.includes(status) || status === "APPROVED") && project.verificationStatus !== "VERIFIED") flash(back, "Verify the project before this status.", false);
  if (status === "COMPLETED" && (!project.outcome.trim() || !project.completedAt)) flash(back, "Record the outcome and completion date (Edit › Publishing) before completing.", false);
  await db.project.update({
    where: { id },
    data: {
      status,
      isPublic: PUBLISHED.includes(status) ? project.isPublic || status === "FUNDRAISING" : false,
      publishedAt: status === "FUNDRAISING" && !project.publishedAt ? new Date() : project.publishedAt,
    },
  });
  if (status === "FUNDRAISING") await db.milestone.updateMany({ where: { projectId: id, title: "Fundraising started", done: false }, data: { done: true, date: new Date() } });
  if (status === "COMPLETED") await db.milestone.updateMany({ where: { projectId: id, title: "Project completed", done: false }, data: { done: true, date: new Date() } });
  await audit(user.id, "project.status", "project", id, `${project.status} → ${status}`);
  revalidatePath("/", "layout");
  flash(back, `Status changed to ${status.replaceAll("_", " ").toLowerCase()}`);
}

const updateSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(3, "Title is too short").max(160),
  body: z.string().trim().min(10, "Write a few sentences").max(10000),
  image: z.string().max(400).optional(),
  milestone: z.string().max(160).default(""),
});

export async function postUpdate(fd: FormData) {
  const user = await requireStaff("project.edit");
  const parsed = updateSchema.safeParse(Object.fromEntries(fd));
  const back = `/admin/projects/${str(fd, "projectId")}#updates`;
  if (!parsed.success) flash(back, zodMessage(parsed.error), false);
  const u = parsed.data;
  const project = await db.project.findUnique({ where: { id: u.projectId } });
  if (!project) flash("/admin/projects", "Project not found", false);
  await db.projectUpdate.create({ data: { projectId: u.projectId, title: u.title, body: u.body, image: u.image || null, milestone: u.milestone } });
  // Notify subscribed donors who supported this project (in-app).
  const supporters = await db.donor.findMany({
    where: { notifyUpdates: true, userId: { not: null }, donations: { some: { projectId: u.projectId, status: { in: ["PAID", "PARTIALLY_REFUNDED"] } } } },
    select: { userId: true },
  });
  for (const s of supporters) {
    await db.notification.create({ data: { userId: s.userId, title: `Update: ${project.title}`, body: u.title } });
  }
  await audit(user.id, "project.update.post", "project", u.projectId, u.title);
  revalidatePath("/", "layout");
  flash(back, `Update published${supporters.length ? ` and ${supporters.length} supporter(s) notified` : ""}`);
}

export async function deleteUpdate(fd: FormData) {
  const user = await requireStaff("project.edit");
  const id = str(fd, "id");
  const u = await db.projectUpdate.delete({ where: { id } });
  await audit(user.id, "project.update.delete", "project", u.projectId, u.title);
  revalidatePath("/", "layout");
  flash(`/admin/projects/${u.projectId}#updates`, "Update removed");
}

export async function toggleMilestone(fd: FormData) {
  const user = await requireStaff("project.edit");
  const id = str(fd, "id");
  const back = str(fd, "back") || "/admin/timeline";
  const m = await db.milestone.findUnique({ where: { id } });
  if (!m) flash(back, "Milestone not found", false);
  await db.milestone.update({ where: { id }, data: { done: !m.done, date: !m.done ? (m.date ?? new Date()) : m.date } });
  await audit(user.id, "milestone.toggle", "milestone", id, `${m.title}: ${!m.done ? "done" : "not done"}`);
  revalidatePath("/", "layout");
  flash(back, `Milestone marked ${!m.done ? "complete" : "incomplete"}`);
}

export async function saveCategory(fd: FormData) {
  const user = await requireStaff("project.edit");
  const schema = z.object({
    id: z.string().optional(),
    name: z.string().trim().min(2).max(80),
    slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case"),
    description: z.string().trim().min(5).max(300),
    image: z.string().trim().min(1),
    icon: z.string().trim().default("Heart"),
    sortOrder: z.coerce.number().int().default(0),
  });
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) flash("/admin/categories", zodMessage(parsed.error), false);
  const { id, ...data } = parsed.data;
  const clash = await db.category.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== id) flash("/admin/categories", "Slug already in use", false);
  if (id) await db.category.update({ where: { id }, data });
  else await db.category.create({ data });
  await audit(user.id, id ? "category.update" : "category.create", "category", id ?? data.slug, data.name);
  revalidatePath("/", "layout");
  flash("/admin/categories", "Category saved");
}

export async function deleteCategory(fd: FormData) {
  const user = await requireStaff("archive");
  const id = str(fd, "id");
  const count = await db.project.count({ where: { categoryId: id } });
  if (count) flash("/admin/categories", "Category has projects and cannot be deleted", false);
  await db.category.delete({ where: { id } });
  await audit(user.id, "category.delete", "category", id);
  revalidatePath("/", "layout");
  flash("/admin/categories", "Category deleted");
}

export async function toggleFeatured(fd: FormData) {
  const user = await requireStaff("content.edit");
  const id = str(fd, "id");
  const p = await db.project.findUnique({ where: { id } });
  if (!p) flash("/admin/cms/featured", "Project not found", false);
  await db.project.update({ where: { id }, data: { featured: !p.featured } });
  await audit(user.id, "project.featured", "project", id, String(!p.featured));
  revalidatePath("/", "layout");
  flash("/admin/cms/featured", !p.featured ? "Added to featured" : "Removed from featured");
}
