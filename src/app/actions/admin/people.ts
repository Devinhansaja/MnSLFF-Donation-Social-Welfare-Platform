"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { flash, str, zodMessage } from "@/lib/admin-utils";

export async function updateDonorConsent(fd: FormData) {
  const user = await requireStaff("content.edit");
  const id = str(fd, "id");
  const schema = z.object({ companyName: z.string().max(160).optional(), logoUrl: z.string().max(400).optional(), donorType: z.enum(["INDIVIDUAL", "CORPORATE", "ORGANIZATION"]) });
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) flash(`/admin/donors/${id}`, zodMessage(parsed.error), false);
  await db.donor.update({
    where: { id },
    data: {
      ...parsed.data, companyName: parsed.data.companyName || null, logoUrl: parsed.data.logoUrl || null,
      publicProfile: fd.get("publicProfile") === "on", showTotals: fd.get("showTotals") === "on", notifyUpdates: fd.get("notifyUpdates") === "on",
    },
  });
  await audit(user.id, "donor.update", "donor", id, `public=${fd.get("publicProfile") === "on"} totals=${fd.get("showTotals") === "on"}`);
  revalidatePath("/", "layout");
  flash(`/admin/donors/${id}`, "Donor preferences saved. Only change public settings with the donor's documented consent.");
}

const FLOW = ["SUBMITTED", "UNDER_REVIEW", "VERIFICATION_ASSIGNED", "FIELD_VERIFICATION", "APPROVED", "REJECTED", "PROJECT_CREATED", "FUNDRAISING_STARTED"];
const NEXT: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["VERIFICATION_ASSIGNED", "REJECTED"],
  VERIFICATION_ASSIGNED: ["FIELD_VERIFICATION", "REJECTED"],
  FIELD_VERIFICATION: ["APPROVED", "REJECTED"],
  APPROVED: ["PROJECT_CREATED"],
  PROJECT_CREATED: ["FUNDRAISING_STARTED"],
  REJECTED: ["UNDER_REVIEW"],
  FUNDRAISING_STARTED: [],
};

export async function advanceApplication(fd: FormData) {
  const user = await requireStaff("application.review");
  const id = str(fd, "id");
  const to = str(fd, "to");
  const back = `/admin/applications/${id}`;
  const app = await db.application.findUnique({ where: { id } });
  if (!app) flash("/admin/applications", "Application not found", false);
  if (!FLOW.includes(to) || !(NEXT[app.status] ?? []).includes(to)) flash(back, `Cannot move from ${app.status} to ${to}`, false);
  const officer = str(fd, "officer");
  if (to === "VERIFICATION_ASSIGNED" && officer.length < 2) flash(back, "Enter the verification officer's name", false);
  const note = str(fd, "note");
  if (to === "REJECTED" && note.length < 5) flash(back, "Add a note explaining the rejection", false);
  await db.application.update({
    where: { id },
    data: {
      status: to,
      officer: to === "VERIFICATION_ASSIGNED" ? officer : app.officer,
      notes: note ? `${app.notes}${app.notes ? "\n" : ""}[${new Date().toISOString().slice(0, 10)} ${user.name}] ${to}: ${note}` : app.notes,
    },
  });
  await audit(user.id, "application.status", "application", id, `${app.status} → ${to}`);
  revalidatePath("/admin/applications");
  flash(back, `Application moved to ${to.replaceAll("_", " ").toLowerCase()}`);
}

export async function addApplicationNote(fd: FormData) {
  const user = await requireStaff("application.review");
  const id = str(fd, "id");
  const note = str(fd, "note");
  if (note.length < 2) flash(`/admin/applications/${id}`, "Note is empty", false);
  const app = await db.application.findUnique({ where: { id } });
  if (!app) flash("/admin/applications", "Not found", false);
  await db.application.update({ where: { id }, data: { notes: `${app.notes}${app.notes ? "\n" : ""}[${new Date().toISOString().slice(0, 10)} ${user.name}] ${note}` } });
  await audit(user.id, "application.note", "application", id);
  flash(`/admin/applications/${id}`, "Note added");
}
