"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireDonor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FormState } from "@/lib/form-utils";

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  country: z.string().length(2),
});

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireDonor();
  const p = profileSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return { ok: false, message: "Please check your details." };
  const data = {
    fullName: p.data.fullName, companyName: p.data.companyName || null, phone: p.data.phone || null, country: p.data.country,
    publicProfile: formData.get("publicProfile") === "on",
    showTotals: formData.get("showTotals") === "on",
    notifyUpdates: formData.get("notifyUpdates") === "on",
  };
  if (user.donor) await db.donor.update({ where: { id: user.donor.id }, data });
  else await db.donor.create({ data: { ...data, userId: user.id, email: user.email } });
  await db.user.update({ where: { id: user.id }, data: { name: p.data.fullName } });
  await audit(user.id, "profile.update", "donor", user.donor?.id ?? "");
  revalidatePath("/account");
  return { ok: true, message: "Your settings were saved." };
}

export async function cancelMonthly(formData: FormData) {
  const user = await requireDonor();
  const id = String(formData.get("donationId") ?? "");
  const d = await db.donation.findUnique({ where: { id }, include: { donor: true } });
  if (!d || d.donor.userId !== user.id || d.frequency !== "MONTHLY") return;
  await db.donation.update({ where: { id }, data: { frequency: "MONTHLY_CANCELLED" } });
  await audit(user.id, "recurring.cancel", "donation", id);
  revalidatePath("/account");
}

export async function toggleSaved(formData: FormData) {
  const user = await requireDonor();
  const projectId = String(formData.get("projectId") ?? "");
  const existing = await db.savedProject.findUnique({ where: { userId_projectId: { userId: user.id, projectId } } });
  if (existing) await db.savedProject.delete({ where: { userId_projectId: { userId: user.id, projectId } } });
  else await db.savedProject.create({ data: { userId: user.id, projectId } });
  revalidatePath("/account");
  const slug = String(formData.get("slug") ?? "");
  if (slug) revalidatePath(`/projects/${slug}`);
}

export async function markNotificationsRead() {
  const user = await requireDonor();
  await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/account");
}
