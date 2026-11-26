"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit, notifyAdmins } from "@/lib/audit";
import { applyRefund, confirmDonation, failDonation } from "@/lib/donations";
import { onDonationConfirmed } from "@/lib/donation-events";
import { canApproveRequest } from "@/lib/rbac";
import { validateItemSponsorship } from "@/lib/finance";
import { dollarsToCents, flash, str, zodMessage } from "@/lib/admin-utils";
import { randomRef } from "@/lib/format";

function revalidateAll() {
  revalidatePath("/", "layout");
}

/** Verify a pending bank transfer or manual donation. The recorder of a manual donation may not verify it. */
export async function verifyPayment(fd: FormData) {
  const user = await requireStaff("payment.verify");
  const id = str(fd, "id");
  const back = `/admin/donations/${id}`;
  const d = await db.donation.findUnique({ where: { id }, include: { bankTransfer: true } });
  if (!d) flash("/admin/donations", "Donation not found", false);
  if (!["BANK_TRANSFER", "MANUAL"].includes(d.method)) flash(back, "Only bank transfers and manual donations are verified manually. Card payments are confirmed by signed gateway webhooks.", false);
  if (d.method === "MANUAL") {
    const recorder = await db.auditLog.findFirst({ where: { entity: "donation", entityId: id, action: "donation.manual.create" } });
    if (recorder?.userId === user.id) flash(back, "Separation of duties: a different staff member must verify a manual donation you recorded.", false);
  }
  const res = await confirmDonation({ donationId: id, gateway: d.method, providerRef: `${d.method === "MANUAL" ? "manual" : "bank"}_${id}`, feeCents: 0, actorId: user.id });
  if (res.status === "confirmed") {
    if (d.bankTransfer) await db.bankTransfer.update({ where: { id: d.bankTransfer.id }, data: { status: "VERIFIED", verifiedBy: user.id, verifiedAt: new Date() } });
    await onDonationConfirmed(id);
    await audit(user.id, "donation.verify", "donation", id, `${d.reference} ${d.amountCents}c${res.itemReallocated ? " (item reallocated to general project needs)" : ""}`);
    revalidateAll();
    flash(back, res.itemReallocated ? "Payment verified. The item was already fully funded, so the gift was allocated to the project's general needs." : "Payment verified and funds counted");
  }
  if (res.status === "duplicate") flash(back, "This payment was already confirmed.", false);
  flash(back, `Cannot verify: donation is ${"current" in res ? res.current : res.status}`, false);
}

export async function rejectPayment(fd: FormData) {
  const user = await requireStaff("payment.verify");
  const id = str(fd, "id");
  const reason = str(fd, "reason") || "Payment could not be verified";
  const d = await db.donation.findUnique({ where: { id }, include: { bankTransfer: true } });
  if (!d) flash("/admin/donations", "Donation not found", false);
  await failDonation(id, d.method, `${d.method.toLowerCase()}_reject_${id}`, "FAILED");
  if (d.bankTransfer) await db.bankTransfer.update({ where: { id: d.bankTransfer.id }, data: { status: "REJECTED", verifiedBy: user.id, verifiedAt: new Date() } });
  await audit(user.id, "donation.reject", "donation", id, `${d.reference}: ${reason}`);
  revalidateAll();
  flash(`/admin/donations/${id}`, "Payment marked as failed");
}

const manualSchema = z.object({
  fullName: z.string().trim().min(2, "Donor name is required").max(160),
  email: z.email("Valid donor email required"),
  country: z.string().length(2, "Choose a country"),
  donorType: z.enum(["INDIVIDUAL", "CORPORATE", "ORGANIZATION"]),
  companyName: z.string().max(160).optional(),
  projectId: z.string().optional(),
  budgetItemId: z.string().optional(),
  itemQuantity: z.coerce.number().int().min(0).default(0),
  amount: z.string().min(1, "Amount is required"),
  originalCurrency: z.enum(["USD", "LKR"]),
  method: z.enum(["MANUAL", "BANK_TRANSFER"]),
  bankRef: z.string().max(80).optional(),
  message: z.string().max(500).default(""),
  anonymous: z.boolean(),
  idempotencyKey: z.string().min(8),
});

export async function recordManualDonation(fd: FormData) {
  const user = await requireStaff("payment.record");
  const parsed = manualSchema.safeParse({ ...Object.fromEntries(fd), anonymous: fd.get("anonymous") === "on" });
  if (!parsed.success) flash("/admin/donations/new", zodMessage(parsed.error), false);
  const v = parsed.data;
  const dupe = await db.donation.findUnique({ where: { idempotencyKey: v.idempotencyKey } });
  if (dupe) flash(`/admin/donations/${dupe.id}`, "This form was already submitted — showing the existing record.", false);

  const original = dollarsToCents(v.amount);
  if (!Number.isFinite(original) || original <= 0) flash("/admin/donations/new", "Enter a positive amount", false);
  let rate = 1;
  if (v.originalCurrency === "LKR") {
    const r = await db.exchangeRate.findFirst({ where: { currency: "LKR" }, orderBy: { date: "desc" } });
    if (!r) flash("/admin/donations/new", "No LKR exchange rate recorded. Add one under Currency Exchange Records.", false);
    rate = r.usdPerUnit;
  }
  let amountCents = Math.round(original * rate);
  let budgetItemId: string | null = null;
  let itemQuantity: number | null = null;
  if (v.budgetItemId) {
    const item = await db.budgetItem.findUnique({ where: { id: v.budgetItemId } });
    if (!item || item.projectId !== v.projectId) flash("/admin/donations/new", "Item does not belong to the selected project", false);
    const check = validateItemSponsorship(item, v.itemQuantity);
    if (!check.ok) flash("/admin/donations/new", check.error, false);
    amountCents = check.amountCents;
    budgetItemId = item.id;
    itemQuantity = v.itemQuantity;
  }
  if (v.projectId) {
    const p = await db.project.findUnique({ where: { id: v.projectId } });
    if (!p) flash("/admin/donations/new", "Project not found", false);
  }

  const email = v.email.toLowerCase();
  const donor =
    (await db.donor.findFirst({ where: { email }, orderBy: { createdAt: "asc" } })) ??
    (await db.donor.create({ data: { fullName: v.fullName, email, country: v.country, donorType: v.donorType, companyName: v.companyName || null } }));

  const d = await db.donation.create({
    data: {
      reference: randomRef("DN"), idempotencyKey: v.idempotencyKey, donorId: donor.id, projectId: v.projectId || null,
      budgetItemId, itemQuantity, amountCents, originalCurrency: v.originalCurrency, originalAmount: original, exchangeRate: rate,
      method: v.method, status: "PENDING", kind: budgetItemId ? "ITEM" : v.projectId ? (v.donorType === "CORPORATE" ? "CORPORATE" : "PROJECT") : "GENERAL",
      anonymous: v.anonymous, showName: !v.anonymous, message: v.message, messageApproved: false,
    },
  });
  if (v.method === "BANK_TRANSFER") await db.bankTransfer.create({ data: { donationId: d.id, bankRef: v.bankRef || "—" } });
  await audit(user.id, "donation.manual.create", "donation", d.id, `${d.reference} ${amountCents}c via ${v.method}`);
  await notifyAdmins("Manual donation awaiting verification", `${d.reference} recorded by ${user.name}`);
  revalidateAll();
  flash(`/admin/donations/${d.id}`, "Recorded as PENDING. A different finance staff member must verify it before it counts.");
}

export async function approveMessage(fd: FormData) {
  const user = await requireStaff("content.edit");
  const id = str(fd, "id");
  const approve = str(fd, "approve") === "1";
  await db.donation.update({ where: { id }, data: { messageApproved: approve } });
  await audit(user.id, approve ? "donation.message.approve" : "donation.message.hide", "donation", id);
  revalidateAll();
  flash(`/admin/donations/${id}`, approve ? "Message approved for public display" : "Message hidden");
}

export async function requestRefund(fd: FormData) {
  const user = await requireStaff("refund");
  const id = str(fd, "id");
  const back = `/admin/donations/${id}`;
  const amountCents = dollarsToCents(str(fd, "amount"));
  const reason = str(fd, "reason");
  if (reason.length < 5) flash(back, "Give a reason for the refund", false);
  const d = await db.donation.findUnique({ where: { id } });
  if (!d) flash("/admin/donations", "Donation not found", false);
  if (!["PAID", "PARTIALLY_REFUNDED"].includes(d.status)) flash(back, "Only confirmed donations can be refunded", false);
  const pending = await db.refund.aggregate({ where: { donationId: id, status: "REQUESTED" }, _sum: { amountCents: true } });
  const refundable = d.amountCents - d.refundedCents - (pending._sum.amountCents ?? 0);
  if (!Number.isFinite(amountCents) || amountCents <= 0 || amountCents > refundable) flash(back, `Refund must be between $0.01 and ${(refundable / 100).toFixed(2)}`, false);
  const refund = await db.refund.create({ data: { donationId: id, amountCents, reason } });
  await db.approvalRequest.create({
    data: { type: "REFUND", entityId: refund.id, amountCents, summary: `Refund ${d.reference}: ${reason}`, requestedById: user.id },
  });
  await audit(user.id, "refund.request", "refund", refund.id, `${d.reference} ${amountCents}c`);
  await notifyAdmins("Refund awaiting second approval", `${d.reference}: ${(amountCents / 100).toFixed(2)} USD`);
  revalidatePath("/admin/approvals");
  flash(back, "Refund requested. A second authorised person must approve it in the Approvals queue.");
}

/** Second-person approval for REFUND, EXPENSE_PAYMENT and ADJUSTMENT requests. */
export async function decideApproval(fd: FormData) {
  const user = await requireStaff("view");
  const id = str(fd, "id");
  const approve = str(fd, "decision") === "APPROVE";
  const req = await db.approvalRequest.findUnique({ where: { id } });
  if (!req || req.status !== "PENDING") flash("/admin/approvals", "Request is no longer pending", false);
  if (!canApproveRequest(user, req)) {
    flash("/admin/approvals", req.requestedById === user.id ? "You cannot approve your own request." : "You don't have permission to decide this request.", false);
  }
  try {
    if (approve) {
      if (req.type === "REFUND") {
        await applyRefund(req.entityId, user.id);
      } else if (req.type === "EXPENSE_PAYMENT") {
        await db.$transaction(async (tx) => {
          const e = await tx.expense.findUnique({ where: { id: req.entityId } });
          if (!e || e.status !== "APPROVED") throw new Error("Expense must be in Approved state to be paid");
          await tx.expense.update({ where: { id: e.id }, data: { status: "PAID" } });
          await tx.ledgerEntry.create({ data: { type: "EXPENSE", amountCents: -e.amountCents, projectId: e.projectId, expenseId: e.id, actorId: user.id, memo: `Expense paid: ${e.title}` } });
        });
      } else if (req.type === "ADJUSTMENT") {
        const payload = JSON.parse(req.summary.split("||")[1] ?? "{}") as { projectId?: string | null; amountCents: number; memo: string };
        await db.ledgerEntry.create({
          data: { type: "ADJUSTMENT", amountCents: payload.amountCents, projectId: payload.projectId || null, actorId: user.id, memo: `Adjustment (requested ${req.requestedById}, approved ${user.id}): ${payload.memo}` },
        });
      }
    } else if (req.type === "REFUND") {
      await db.refund.update({ where: { id: req.entityId }, data: { status: "REJECTED" } });
    }
  } catch (e) {
    flash("/admin/approvals", (e as Error).message, false);
  }
  await db.approvalRequest.update({ where: { id }, data: { status: approve ? "APPROVED" : "REJECTED", approvedById: user.id, decidedAt: new Date() } });
  await audit(user.id, `approval.${approve ? "approve" : "reject"}`, "approval", id, `${req.type} ${req.amountCents}c`);
  revalidateAll();
  flash("/admin/approvals", approve ? `${req.type.replace("_", " ").toLowerCase()} approved and applied` : "Request rejected");
}
