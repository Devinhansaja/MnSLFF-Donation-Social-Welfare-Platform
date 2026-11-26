"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { STAFF_ROLES, type Permission } from "@/lib/rbac";
import { ADAPTERS } from "@/lib/payments";
import { flash, str, zodMessage } from "@/lib/admin-utils";

const SETTING_KEY = /^(orgName|orgShort|tagline|description|email|phone|address|registration|bank[A-Za-z]+|feePercent|feeFixedCents|social_[a-z]+|page_[a-z-]+|seo_[a-z_]+|tpl_[a-z_]+|home_[a-z_]+|statFamilies)$/;

/** Saves every form field named `s:<key>` into the Setting table (whitelisted keys only). */
export async function saveSettings(fd: FormData) {
  const back = str(fd, "back") || "/admin/settings";
  const perm: Permission = back.startsWith("/admin/settings") || back.startsWith("/admin/email") ? "settings.manage" : "content.edit";
  const user = await requireStaff(perm);
  const entries = [...fd.entries()].filter(([k]) => k.startsWith("s:")).map(([k, v]) => [k.slice(2), String(v)] as const);
  for (const [key, value] of entries) {
    if (!SETTING_KEY.test(key)) flash(back, `Setting ${key} is not editable`, false);
    if (value.length > 20000) flash(back, `${key} is too long`, false);
    if (key === "feePercent" && !(Number(value) >= 0 && Number(value) < 20)) flash(back, "Fee percent must be between 0 and 20", false);
    if (key === "feeFixedCents" && !(Number.isInteger(Number(value)) && Number(value) >= 0)) flash(back, "Fixed fee must be whole cents", false);
    if (key === "email" && value && !z.email().safeParse(value).success) flash(back, "Contact email is invalid", false);
  }
  for (const [key, value] of entries) await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  await audit(user.id, "settings.update", "setting", "", entries.map(([k]) => k).join(", "));
  revalidatePath("/", "layout");
  flash(back, "Saved");
}

export async function saveHeroImages(fd: FormData) {
  const user = await requireStaff("content.edit");
  const images = fd.getAll("images").map(String).filter((s) => s.startsWith("/images/"));
  if (!images.length) flash("/admin/cms/hero", "Choose at least one image", false);
  await db.setting.upsert({ where: { key: "heroImages" }, create: { key: "heroImages", value: JSON.stringify(images) }, update: { value: JSON.stringify(images) } });
  await audit(user.id, "cms.hero", "setting", "heroImages", images.join(","));
  revalidatePath("/", "layout");
  flash("/admin/cms/hero", `Hero slideshow updated (${images.length} images)`);
}

const testimonialSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  role: z.enum(["BENEFICIARY", "DONOR", "COORDINATOR", "VOLUNTEER"]),
  quote: z.string().trim().min(10, "Quote is too short").max(1000),
  image: z.string().max(400).optional(),
  consent: z.boolean(),
  approved: z.boolean(),
});

export async function saveTestimonial(fd: FormData) {
  const user = await requireStaff("content.edit");
  const parsed = testimonialSchema.safeParse({ ...Object.fromEntries(fd), consent: fd.get("consent") === "on", approved: fd.get("approved") === "on" });
  if (!parsed.success) flash("/admin/cms/testimonials", zodMessage(parsed.error), false);
  const { id, ...data } = parsed.data;
  if (data.approved && !data.consent) flash("/admin/cms/testimonials", "A testimonial can only be published with recorded consent.", false);
  const row = { ...data, image: data.image || null };
  if (id) await db.testimonial.update({ where: { id }, data: row });
  else await db.testimonial.create({ data: row });
  await audit(user.id, id ? "testimonial.update" : "testimonial.create", "testimonial", id ?? "", data.name);
  revalidatePath("/", "layout");
  flash("/admin/cms/testimonials", "Testimonial saved");
}

export async function deleteTestimonial(fd: FormData) {
  const user = await requireStaff("content.edit");
  const id = str(fd, "id");
  await db.testimonial.delete({ where: { id } });
  await audit(user.id, "testimonial.delete", "testimonial", id);
  revalidatePath("/", "layout");
  flash("/admin/cms/testimonials", "Testimonial deleted");
}

export async function deleteMessage(fd: FormData) {
  const user = await requireStaff("content.edit");
  const id = str(fd, "id");
  await db.contactMessage.delete({ where: { id } });
  await audit(user.id, "contact.delete", "contactMessage", id);
  flash("/admin/cms/messages", "Message deleted");
}

const staffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  role: z.enum(STAFF_ROLES as [string, ...string[]]),
  password: z.string().min(12, "Temporary password must be at least 12 characters").regex(/[A-Za-z]/).regex(/[0-9]/, "Include a number"),
});

export async function createStaff(fd: FormData) {
  const user = await requireStaff("staff.manage");
  const parsed = staffSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) flash("/admin/staff", zodMessage(parsed.error), false);
  const email = parsed.data.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) flash("/admin/staff", "A user with that email already exists", false);
  if (parsed.data.role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") flash("/admin/staff", "Only a Super Administrator can create another", false);
  const created = await db.user.create({ data: { email, name: parsed.data.name, role: parsed.data.role, passwordHash: await hashPassword(parsed.data.password) } });
  await audit(user.id, "staff.create", "user", created.id, `${email} as ${parsed.data.role}`);
  flash("/admin/staff", `Staff account created for ${email}. Share the temporary password securely.`);
}

export async function updateStaff(fd: FormData) {
  const user = await requireStaff("staff.manage");
  const id = str(fd, "id");
  const role = str(fd, "role");
  const active = fd.get("active") === "on";
  if (id === user.id) flash("/admin/staff", "You cannot change your own role or deactivate yourself", false);
  if (!(STAFF_ROLES as string[]).includes(role)) flash("/admin/staff", "Invalid role", false);
  const target = await db.user.findUnique({ where: { id } });
  if (!target) flash("/admin/staff", "User not found", false);
  if ((target.role === "SUPER_ADMIN" || role === "SUPER_ADMIN") && user.role !== "SUPER_ADMIN") flash("/admin/staff", "Only a Super Administrator can change Super Administrator accounts", false);
  await db.user.update({ where: { id }, data: { role, active } });
  await audit(user.id, "staff.update", "user", id, `${target.role}→${role} active=${active}`);
  flash("/admin/staff", "Staff account updated");
}

export async function markNotifications(fd: FormData) {
  const user = await requireStaff("view");
  const id = str(fd, "id");
  const scope = { OR: [{ userId: null }, { userId: user.id }] };
  if (id) await db.notification.updateMany({ where: { id, ...scope }, data: { read: true } });
  else await db.notification.updateMany({ where: { read: false, ...scope }, data: { read: true } });
  revalidatePath("/admin", "layout");
  flash("/admin/notifications", id ? "Marked as read" : "All notifications marked as read");
}

export async function toggleGateway(fd: FormData) {
  const user = await requireStaff("settings.manage");
  const code = str(fd, "code");
  const g = await db.paymentGateway.findUnique({ where: { code } });
  if (!g) flash("/admin/gateways", "Gateway not found", false);
  const enabling = !g.enabled;
  if (enabling && !["BANK_TRANSFER", "MANUAL"].includes(code)) {
    const adapter = ADAPTERS[code];
    if (!adapter || !adapter.isConfigured()) flash("/admin/gateways", `${g.name} cannot be enabled: merchant credentials are not configured in the server environment.`, false);
  }
  await db.paymentGateway.update({ where: { code }, data: { enabled: enabling } });
  await audit(user.id, enabling ? "gateway.enable" : "gateway.disable", "paymentGateway", code);
  revalidatePath("/", "layout");
  flash("/admin/gateways", `${g.name} ${enabling ? "enabled" : "disabled"}`);
}

export async function createBackup() {
  const user = await requireStaff("settings.manage");
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) flash("/admin/backup", "Automatic file backup only works for SQLite. Use pg_dump / your provider's backups for PostgreSQL.", false);
  const src = path.resolve(process.cwd(), "prisma", url.slice(5).replace(/^\.\//, ""));
  const dir = path.resolve(process.cwd(), "storage", "backups");
  await fs.mkdir(dir, { recursive: true });
  const name = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
  try {
    // Flush WAL so the copy is consistent.
    await db.$queryRawUnsafe("PRAGMA wal_checkpoint(FULL)").catch(() => null);
    await fs.copyFile(src, path.join(dir, name));
  } catch (e) {
    flash("/admin/backup", `Backup failed: ${(e as Error).message}`, false);
  }
  await audit(user.id, "backup.create", "system", name);
  flash("/admin/backup", `Backup created: ${name}`);
}
