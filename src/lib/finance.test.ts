import { describe, expect, it } from "vitest";
import {
  coverFeeAmount,
  fundingPercent,
  projectFinance,
  sumDonations,
  validateItemSponsorship,
  toUsdCents,
} from "./finance";

const paid = (amount: number, fee = 0, refunded = 0, status = "PAID") => ({
  amountCents: amount,
  feeCents: fee,
  refundedCents: refunded,
  status,
});

describe("sumDonations", () => {
  it("ignores unconfirmed donations", () => {
    const t = sumDonations([paid(1000), paid(500, 0, 0, "PENDING"), paid(700, 0, 0, "FAILED"), paid(900, 0, 0, "INITIATED")]);
    expect(t.gross).toBe(1000);
    expect(t.count).toBe(1);
  });

  it("subtracts refunds and chargebacks from gross but keeps fees", () => {
    const t = sumDonations([
      paid(10000, 320),
      paid(5000, 175, 2000, "PARTIALLY_REFUNDED"),
      paid(3000, 117, 3000, "REFUNDED"),
      paid(2000, 88, 0, "CHARGEBACK"),
    ]);
    expect(t.grossReceived).toBe(20000);
    expect(t.gross).toBe(10000 + 3000);
    expect(t.refunds).toBe(2000 + 3000 + 2000);
    expect(t.fees).toBe(320 + 175 + 117 + 88);
    expect(t.net).toBe(13000 - 700);
  });
});

describe("projectFinance", () => {
  it("matches the spec example: $5,000 target, $3,250 collected", () => {
    const f = projectFinance({ goalCents: 500000, costCents: 485000 }, [paid(200000, 6000), paid(125000, 3750)]);
    expect(f.gross).toBe(325000);
    expect(f.remainingGross).toBe(175000);
    expect(f.percent).toBe(65);
    expect(f.net).toBe(315250);
    expect(f.remainingNet).toBe(485000 - 315250);
  });

  it("never reports negative remaining and tracks overfunding separately", () => {
    const f = projectFinance({ goalCents: 100000, costCents: 95000 }, [paid(130000, 4000)]);
    expect(f.remainingGross).toBe(0);
    expect(f.remainingNet).toBe(0);
    expect(f.overfunded).toBe(30000);
    expect(f.percent).toBe(130);
  });

  it("available balance deducts only paid expenses; commitments are separate", () => {
    const f = projectFinance({ goalCents: 100000, costCents: 100000 }, [paid(80000, 2000)], [
      { amountCents: 30000, status: "PAID" },
      { amountCents: 10000, status: "APPROVED" },
      { amountCents: 5000, status: "PENDING" },
      { amountCents: 9999, status: "REJECTED" },
    ]);
    expect(f.expensesPaid).toBe(30000);
    expect(f.commitments).toBe(10000);
    expect(f.available).toBe(78000 - 30000);
  });
});

describe("fundingPercent", () => {
  it("handles zero goals and floors to one decimal", () => {
    expect(fundingPercent(100, 0)).toBe(0);
    expect(fundingPercent(1, 3)).toBe(33.3);
    expect(fundingPercent(2, 3)).toBe(66.6);
  });
});

describe("validateItemSponsorship", () => {
  const item = { quantity: 30, fundedQty: 28, unitCents: 5000, sponsorable: true };
  it("prices valid sponsorships", () => {
    expect(validateItemSponsorship(item, 2)).toEqual({ ok: true, amountCents: 10000 });
  });
  it("rejects over-allocation, zero and fractional quantities", () => {
    expect(validateItemSponsorship(item, 3).ok).toBe(false);
    expect(validateItemSponsorship(item, 0).ok).toBe(false);
    expect(validateItemSponsorship(item, 1.5).ok).toBe(false);
    expect(validateItemSponsorship({ ...item, sponsorable: false }, 1).ok).toBe(false);
  });
});

describe("currency helpers", () => {
  it("cover-fee makes the net equal the intended gift", () => {
    const amount = 10000;
    const extra = coverFeeAmount(amount, 0.029, 30);
    const total = amount + extra;
    const net = total - Math.round(total * 0.029 + 30);
    expect(net).toBeGreaterThanOrEqual(amount);
    expect(net - amount).toBeLessThanOrEqual(1);
  });
  it("converts LKR minor units to USD cents", () => {
    // LKR 30,000.00 at 0.0033 USD per LKR = $99.00
    expect(toUsdCents(3000000, 0.0033)).toBe(9900);
  });
});
