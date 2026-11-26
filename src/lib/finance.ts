/**
 * Pure financial calculations. All amounts are integer US cents.
 * These functions are the single source of truth for every total shown
 * on the public site, the donor portal and the admin dashboard.
 */

export const CONFIRMED_STATUSES = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED", "CHARGEBACK"] as const;

export type DonationLike = {
  amountCents: number;
  feeCents: number;
  refundedCents: number;
  status: string;
};

export type ExpenseLike = {
  amountCents: number;
  status: string; // PENDING | APPROVED | PAID | REJECTED
};

export function isConfirmed(status: string) {
  return (CONFIRMED_STATUSES as readonly string[]).includes(status);
}

/** Gross amount a single donation still contributes after refunds/reversals. */
export function donationGross(d: DonationLike): number {
  if (!isConfirmed(d.status)) return 0;
  if (d.status === "CHARGEBACK") return 0;
  return Math.max(0, d.amountCents - d.refundedCents);
}

/** Processing fees actually incurred. Fees on confirmed payments are not returned on refund. */
export function donationFee(d: DonationLike): number {
  return isConfirmed(d.status) ? d.feeCents : 0;
}

export type DonationTotals = {
  grossReceived: number; // confirmed gross before refunds
  refunds: number;
  gross: number; // gross collected (after refunds and reversals)
  fees: number;
  net: number;
  count: number; // confirmed donations
};

export function sumDonations(donations: DonationLike[]): DonationTotals {
  let grossReceived = 0;
  let refunds = 0;
  let gross = 0;
  let fees = 0;
  let count = 0;
  for (const d of donations) {
    if (!isConfirmed(d.status)) continue;
    count++;
    grossReceived += d.amountCents;
    const g = donationGross(d);
    refunds += d.amountCents - g;
    gross += g;
    fees += donationFee(d);
  }
  return { grossReceived, refunds, gross, fees, net: gross - fees, count };
}

export type ExpenseTotals = { paid: number; committed: number; pending: number };

export function sumExpenses(expenses: ExpenseLike[]): ExpenseTotals {
  const t = { paid: 0, committed: 0, pending: 0 };
  for (const e of expenses) {
    if (e.status === "PAID") t.paid += e.amountCents;
    else if (e.status === "APPROVED") t.committed += e.amountCents;
    else if (e.status === "PENDING") t.pending += e.amountCents;
  }
  return t;
}

export type ProjectFinance = DonationTotals & {
  goal: number;
  cost: number;
  remainingGross: number;
  remainingNet: number;
  percent: number; // 0..(can exceed 100), one decimal
  overfunded: number;
  expensesPaid: number;
  commitments: number;
  available: number;
};

export function projectFinance(
  project: { goalCents: number; costCents: number },
  donations: DonationLike[],
  expenses: ExpenseLike[] = [],
): ProjectFinance {
  const d = sumDonations(donations);
  const e = sumExpenses(expenses);
  const goal = project.goalCents;
  const cost = project.costCents;
  return {
    ...d,
    goal,
    cost,
    remainingGross: Math.max(0, goal - d.gross),
    remainingNet: Math.max(0, cost - d.net),
    percent: fundingPercent(d.gross, goal),
    overfunded: Math.max(0, d.gross - goal),
    expensesPaid: e.paid,
    commitments: e.committed,
    available: d.net - e.paid,
  };
}

export function fundingPercent(grossCents: number, goalCents: number): number {
  if (goalCents <= 0) return 0;
  return Math.floor((grossCents / goalCents) * 1000) / 10;
}

/** Fee a donor can optionally cover so the cause receives the full amount. */
export function coverFeeAmount(amountCents: number, pct: number, fixedCents: number): number {
  // Solve total such that total - (total*pct + fixed) = amount
  const total = Math.ceil((amountCents + fixedCents) / (1 - pct));
  return total - amountCents;
}

/** Remaining quantity of a budget item that can still be sponsored. */
export function itemRemaining(item: { quantity: number; fundedQty: number }) {
  return Math.max(0, item.quantity - item.fundedQty);
}

export function validateItemSponsorship(
  item: { quantity: number; fundedQty: number; unitCents: number; sponsorable: boolean },
  qty: number,
): { ok: true; amountCents: number } | { ok: false; error: string } {
  if (!item.sponsorable) return { ok: false, error: "This item is not open for sponsorship." };
  if (!Number.isInteger(qty) || qty < 1) return { ok: false, error: "Quantity must be at least 1." };
  const remaining = itemRemaining(item);
  if (qty > remaining) return { ok: false, error: `Only ${remaining} remaining for this item.` };
  return { ok: true, amountCents: qty * item.unitCents };
}

/** Convert an amount in another currency's minor units to USD cents. */
export function toUsdCents(originalMinor: number, usdPerUnit: number): number {
  return Math.round(originalMinor * usdPerUnit);
}
