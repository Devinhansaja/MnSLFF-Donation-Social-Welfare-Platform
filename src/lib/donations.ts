import { Prisma, PrismaClient } from "@prisma/client";
import { db as defaultDb } from "./db";
import { itemRemaining } from "./finance";

type Tx = Prisma.TransactionClient;

export type ConfirmInput = {
  donationId: string;
  gateway: string;
  providerRef: string; // unique per provider event; enforces idempotency
  feeCents: number;
  rawPayload?: string;
  actorId?: string | null;
};

export type ConfirmResult =
  | { status: "confirmed"; itemReallocated: boolean }
  | { status: "duplicate" }
  | { status: "not_found" }
  | { status: "invalid_state"; current: string };

/**
 * Confirms a payment. This is the ONLY code path that turns a donation into
 * counted funds. It runs in one DB transaction and is safe to call repeatedly
 * with the same providerRef (webhook retries).
 */
export async function confirmDonation(input: ConfirmInput, client: PrismaClient = defaultDb): Promise<ConfirmResult> {
  try {
    return await client.$transaction(async (tx) => {
      const existing = await tx.transaction.findUnique({ where: { providerRef: input.providerRef } });
      if (existing) return { status: "duplicate" } as const;

      const donation = await tx.donation.findUnique({ where: { id: input.donationId } });
      if (!donation) return { status: "not_found" } as const;
      if (donation.status === "PAID") {
        // Already confirmed via another event; record the event but change nothing.
        await tx.transaction.create({
          data: {
            donationId: donation.id, gateway: input.gateway, providerRef: input.providerRef,
            eventType: "payment.duplicate", status: "IGNORED", amountCents: 0, rawPayload: input.rawPayload ?? "",
          },
        });
        return { status: "duplicate" } as const;
      }
      if (!["INITIATED", "PENDING", "PROCESSING"].includes(donation.status)) {
        return { status: "invalid_state", current: donation.status } as const;
      }

      const total = donation.amountCents + donation.coveredFeeCents;
      const fee = Math.max(0, input.feeCents - donation.coveredFeeCents);

      await tx.transaction.create({
        data: {
          donationId: donation.id,
          gateway: input.gateway,
          providerRef: input.providerRef,
          eventType: "payment.succeeded",
          status: "PAID",
          amountCents: total,
          feeCents: input.feeCents,
          netCents: total - input.feeCents,
          rawPayload: input.rawPayload ?? "",
        },
      });

      // Item sponsorship: atomic conditional increment prevents over-allocation
      // even when two payments for the last units confirm at the same moment.
      let itemReallocated = false;
      if (donation.budgetItemId && donation.itemQuantity) {
        const updated = await incrementItem(tx, donation.budgetItemId, donation.itemQuantity);
        if (!updated) {
          itemReallocated = true;
          await tx.donation.update({
            where: { id: donation.id },
            data: { budgetItemId: null, itemQuantity: null, kind: "PROJECT" },
          });
        }
      }

      await tx.donation.update({
        where: { id: donation.id },
        data: { status: "PAID", feeCents: fee, confirmedAt: new Date() },
      });

      await tx.ledgerEntry.create({
        data: {
          type: "DONATION", amountCents: donation.amountCents, projectId: donation.projectId,
          donationId: donation.id, actorId: input.actorId ?? null,
          memo: `Donation ${donation.reference} confirmed via ${input.gateway}${itemReallocated ? " (item fully funded; allocated to project general needs)" : ""}`,
        },
      });
      if (fee > 0) {
        await tx.ledgerEntry.create({
          data: {
            type: "FEE", amountCents: -fee, projectId: donation.projectId, donationId: donation.id,
            actorId: input.actorId ?? null, memo: `Processing fee for ${donation.reference}`,
          },
        });
      }

      if (donation.projectId) await refreshProjectStatus(tx, donation.projectId);
      return { status: "confirmed", itemReallocated } as const;
    });
  } catch (e) {
    // Unique violation on providerRef from a concurrent retry = duplicate.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { status: "duplicate" };
    throw e;
  }
}

async function incrementItem(tx: Tx, itemId: string, qty: number) {
  const item = await tx.budgetItem.findUnique({ where: { id: itemId } });
  if (!item || itemRemaining(item) < qty) return false;
  const res = await tx.budgetItem.updateMany({
    where: { id: itemId, fundedQty: { lte: item.quantity - qty } },
    data: { fundedQty: { increment: qty } },
  });
  return res.count === 1;
}

/** Moves FUNDRAISING/URGENT projects to FULLY_FUNDED once the gross target is met. */
export async function refreshProjectStatus(tx: Tx, projectId: string) {
  const project = await tx.project.findUnique({ where: { id: projectId } });
  if (!project || project.status !== "FUNDRAISING") return;
  const agg = await tx.donation.aggregate({
    where: { projectId, status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
    _sum: { amountCents: true, refundedCents: true },
  });
  const gross = (agg._sum.amountCents ?? 0) - (agg._sum.refundedCents ?? 0);
  if (gross >= project.goalCents) {
    await tx.project.update({ where: { id: projectId }, data: { status: "FULLY_FUNDED" } });
    await tx.milestone.updateMany({
      where: { projectId, title: "Funding target reached", done: false },
      data: { done: true, date: new Date() },
    });
  }
}

export async function failDonation(donationId: string, gateway: string, providerRef: string, status: "FAILED" | "CANCELLED", client: PrismaClient = defaultDb) {
  try {
    await client.$transaction(async (tx) => {
      const d = await tx.donation.findUnique({ where: { id: donationId } });
      if (!d || !["INITIATED", "PENDING", "PROCESSING"].includes(d.status)) return;
      await tx.transaction.create({
        data: { donationId, gateway, providerRef, eventType: `payment.${status.toLowerCase()}`, status, amountCents: 0 },
      });
      await tx.donation.update({ where: { id: donationId }, data: { status } });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return;
    throw e;
  }
}

/**
 * Applies an APPROVED refund. Called only after dual approval.
 * Refunds reduce gross; processing fees already paid are not returned.
 */
export async function applyRefund(refundId: string, actorId: string, client: PrismaClient = defaultDb) {
  return client.$transaction(async (tx) => {
    const refund = await tx.refund.findUnique({ where: { id: refundId }, include: { donation: true } });
    if (!refund || refund.status !== "REQUESTED") throw new Error("Refund is not awaiting approval");
    const d = refund.donation;
    const refundable = d.amountCents - d.refundedCents;
    if (refund.amountCents <= 0 || refund.amountCents > refundable) throw new Error("Refund exceeds refundable amount");
    const newRefunded = d.refundedCents + refund.amountCents;
    await tx.refund.update({ where: { id: refundId }, data: { status: "APPROVED" } });
    await tx.donation.update({
      where: { id: d.id },
      data: { refundedCents: newRefunded, status: newRefunded >= d.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED" },
    });
    await tx.ledgerEntry.create({
      data: {
        type: "REFUND", amountCents: -refund.amountCents, projectId: d.projectId, donationId: d.id, actorId,
        memo: `Refund for ${d.reference}: ${refund.reason}`,
      },
    });
  });
}
