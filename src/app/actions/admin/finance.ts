"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit, notifyAdmins } from "@/lib/audit";
import { dollarsToCents, flash, str, zodMessage } from "@/lib/admin-utils";

const expenseSchema = z.object({
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
  title: z.string().trim().min(3, "Title is required").max(160),
  category: z.string().trim().min(2, "Category is required").max(80),
  description: z.string().max(2000).default(""),
  amount: z.string().min(1),
  date: z.string().min(1, "Date is required"),
  invoiceUrl: z.string().max(400).optional(),
  administrative: z.boolean(),
  isPublic: z.boolean(),
});

export async function createExpense(fd: FormData) {
  const user = await requireStaff("expense.create");
  const back = "/admin/finance/expenses";
  const parsed = expenseSchema.safeParse({ ...Object.fromEntries(fd), administrative: fd.get("administrative") === "on", isPublic: fd.get("isPublic") === "on" });
  if (!parsed.success) flash(back, zodMessage(parsed.error), false);
  const v = parsed.data;
  const cents = dollarsToCents(v.amount);
  if (!Number.isFinite(cents) || cents <= 0) flash(back, "Enter a positive amount", false);
  if (!v.administrative && !v.projectId) flash(back, "Choose a project, or tick Administrative expense", false);
  if (v.milestoneId) {
    const m = await db.milestone.findUnique({ where: { id: v.milestoneId } });
    if (!m || m.projectId !== v.projectId) flash(back, "Milestone does not belong to the chosen project", false);
  }
  const e = await db.expense.create({
    data: {
      projectId: v.administrative ? (v.projectId || null) : v.projectId!, milestoneId: v.milestoneId || null, title: v.title, category: v.category,
      description: v.description, amountCents: cents, date: new Date(v.date), administrative: v.administrative, isPublic: v.isPublic,
      invoiceUrl: v.invoiceUrl || null, status: "PENDING", createdById: user.id,
    },
  });
  await audit(user.id, "expense.create", "expense", e.id, `${v.title} ${cents}c`);
  await notifyAdmins("Expense approval required", `${v.title}: ${(cents / 100).toFixed(2)} USD`);
  revalidatePath(back);
  flash(back, "Expense recorded as pending approval");
}

/** Approve (commit) or reject an expense. The creator may not approve their own expense. */
export async function decideExpense(fd: FormData) {
  const user = await requireStaff("expense.approve");
  const id = str(fd, "id");
  const approve = str(fd, "decision") === "APPROVE";
  const back = "/admin/finance/expenses";
  const e = await db.expense.findUnique({ where: { id } });
  if (!e || e.status !== "PENDING") flash(back, "Expense is not awaiting approval", false);
  if (e.createdById === user.id) flash(back, "Separation of duties: you cannot approve an expense you created.", false);
  await db.expense.update({ where: { id }, data: { status: approve ? "APPROVED" : "REJECTED", approvedById: user.id } });
  await audit(user.id, approve ? "expense.approve" : "expense.reject", "expense", id, e.title);
  revalidatePath("/", "layout");
  flash(back, approve ? "Expense approved — recorded as an outstanding commitment" : "Expense rejected");
}

/** Release of funds needs a second person: this only creates the approval request. */
export async function requestExpensePayment(fd: FormData) {
  const user = await requireStaff("expense.create");
  const id = str(fd, "id");
  const back = "/admin/finance/expenses";
  const e = await db.expense.findUnique({ where: { id } });
  if (!e || e.status !== "APPROVED") flash(back, "Only approved expenses can be paid", false);
  const open = await db.approvalRequest.findFirst({ where: { type: "EXPENSE_PAYMENT", entityId: id, status: "PENDING" } });
  if (open) flash(back, "A payment request for this expense is already pending", false);
  await db.approvalRequest.create({ data: { type: "EXPENSE_PAYMENT", entityId: id, amountCents: e.amountCents, summary: `Pay expense: ${e.title}`, requestedById: user.id } });
  await audit(user.id, "expense.payment.request", "expense", id, e.title);
  await notifyAdmins("Fund release awaiting approval", `${e.title}: ${(e.amountCents / 100).toFixed(2)} USD`);
  revalidatePath("/admin/approvals");
  flash(back, "Payment request sent to the approvals queue");
}

export async function setSettlement(fd: FormData) {
  const user = await requireStaff("payment.verify");
  const id = str(fd, "id");
  const status = str(fd, "settlement");
  if (!["UNSETTLED", "SETTLED", "RECONCILED"].includes(status)) flash("/admin/finance/reconciliation", "Invalid status", false);
  await db.transaction.update({ where: { id }, data: { settlement: status } });
  await audit(user.id, "transaction.settlement", "transaction", id, status);
  revalidatePath("/admin/finance/reconciliation");
  flash("/admin/finance/reconciliation", `Marked ${status.toLowerCase()}`);
}

export async function addExchangeRate(fd: FormData) {
  const user = await requireStaff("payment.record");
  const schema = z.object({ currency: z.enum(["LKR"]), usdPerUnit: z.coerce.number().positive().max(10), lkrPerUsd: z.coerce.number().optional() });
  const lkrPerUsd = Number(str(fd, "lkrPerUsd"));
  const parsed = schema.safeParse({ currency: str(fd, "currency") || "LKR", usdPerUnit: lkrPerUsd > 0 ? 1 / lkrPerUsd : str(fd, "usdPerUnit") });
  if (!parsed.success) flash("/admin/finance/exchange", "Enter a valid rate (e.g. 300 LKR per USD)", false);
  await db.exchangeRate.create({ data: { currency: parsed.data.currency, usdPerUnit: parsed.data.usdPerUnit } });
  await audit(user.id, "exchange.add", "exchangeRate", parsed.data.currency, String(parsed.data.usdPerUnit));
  revalidatePath("/admin/finance/exchange");
  flash("/admin/finance/exchange", "Exchange rate recorded");
}

export async function requestAdjustment(fd: FormData) {
  const user = await requireStaff("payment.record");
  const back = "/admin/finance/adjustments";
  const amountCents = dollarsToCents(str(fd, "amount"));
  const memo = str(fd, "memo");
  const projectId = str(fd, "projectId") || null;
  if (!Number.isFinite(amountCents) || amountCents === 0) flash(back, "Enter a non-zero amount (negative to reduce)", false);
  if (memo.length < 10) flash(back, "Document the reason for the adjustment (at least 10 characters)", false);
  if (projectId && !(await db.project.findUnique({ where: { id: projectId } }))) flash(back, "Project not found", false);
  const req = await db.approvalRequest.create({
    data: {
      type: "ADJUSTMENT", entityId: projectId ?? "general", amountCents,
      summary: `Adjustment: ${memo}||${JSON.stringify({ projectId, amountCents, memo })}`, requestedById: user.id,
    },
  });
  await audit(user.id, "adjustment.request", "approval", req.id, memo);
  revalidatePath("/admin/approvals");
  flash(back, "Adjustment submitted for second approval");
}
