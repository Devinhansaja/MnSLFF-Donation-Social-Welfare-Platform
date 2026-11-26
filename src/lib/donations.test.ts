import { afterAll, beforeEach, describe, expect, inject, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { applyRefund, confirmDonation, failDonation } from "./donations";
import { projectFinance } from "./finance";

const url = inject("testDbUrl");
// Skipped unless TEST_DATABASE_URL points at an empty disposable Postgres database.
const dbDescribe = url ? describe : describe.skip;
const db = new PrismaClient(url ? { datasourceUrl: url } : undefined);
let n = 0;

async function setup(opts: { goal?: number; itemQty?: number; fundedQty?: number } = {}) {
  n++;
  const cat = await db.category.create({ data: { slug: `c${n}`, name: "Cat", description: "", image: "", icon: "" } });
  const project = await db.project.create({
    data: {
      code: `T-${n}`, slug: `p${n}`, title: "Test project", categoryId: cat.id, shortDescription: "", status: "FUNDRAISING",
      location: "", district: "", goalCents: opts.goal ?? 100000, costCents: opts.goal ?? 100000, coverImage: "", isPublic: true,
    },
  });
  const item = await db.budgetItem.create({ data: { projectId: project.id, name: "Desk", quantity: opts.itemQty ?? 10, fundedQty: opts.fundedQty ?? 0, unitCents: 5000 } });
  const donor = await db.donor.create({ data: { fullName: "T", email: `t${n}@example.com`, country: "US" } });
  return { project, item, donor };
}

async function donation(donorId: string, projectId: string, amount: number, extra: Record<string, unknown> = {}) {
  n++;
  return db.donation.create({
    data: { reference: `R${n}`, idempotencyKey: `k${n}`, donorId, projectId, amountCents: amount, originalAmount: amount, method: "SANDBOX", ...extra },
  });
}

const projectTotals = async (projectId: string) => {
  const p = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  const ds = await db.donation.findMany({ where: { projectId } });
  const es = await db.expense.findMany({ where: { projectId } });
  return projectFinance(p, ds, es);
};

beforeEach(async () => {
  if (!url) return;
  for (const t of ["ledgerEntry", "transaction", "refund", "bankTransfer", "donation", "expense", "budgetItem", "milestone", "project", "category", "donor"] as const) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db[t] as any).deleteMany();
  }
});
afterAll(() => (url ? db.$disconnect() : undefined));

dbDescribe("confirmDonation", () => {
  it("confirms once, writes ledger entries, and ignores webhook retries", async () => {
    const { project, donor } = await setup();
    const d = await donation(donor.id, project.id, 10000);
    const first = await confirmDonation({ donationId: d.id, gateway: "SANDBOX", providerRef: "evt_1", feeCents: 320 }, db);
    const retry = await confirmDonation({ donationId: d.id, gateway: "SANDBOX", providerRef: "evt_1", feeCents: 320 }, db);
    const otherEvent = await confirmDonation({ donationId: d.id, gateway: "SANDBOX", providerRef: "evt_2", feeCents: 320 }, db);
    expect(first.status).toBe("confirmed");
    expect(retry.status).toBe("duplicate");
    expect(otherEvent.status).toBe("duplicate");
    const t = await projectTotals(project.id);
    expect(t.gross).toBe(10000);
    expect(t.fees).toBe(320);
    const ledger = await db.ledgerEntry.findMany({ where: { donationId: d.id } });
    expect(ledger.map((l) => [l.type, l.amountCents]).sort()).toEqual([["DONATION", 10000], ["FEE", -320]]);
  });

  it("handles concurrent deliveries of the same event exactly once", async () => {
    const { project, donor } = await setup();
    const d = await donation(donor.id, project.id, 5000);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => confirmDonation({ donationId: d.id, gateway: "SANDBOX", providerRef: "evt_same", feeCents: 175 }, db)),
    );
    expect(results.filter((r) => r.status === "confirmed")).toHaveLength(1);
    expect((await projectTotals(project.id)).gross).toBe(5000);
  });

  it("subtracts only the uncovered part of the gateway fee", async () => {
    const { project, donor } = await setup();
    const d = await donation(donor.id, project.id, 10000, { coveredFeeCents: 330 });
    await confirmDonation({ donationId: d.id, gateway: "SANDBOX", providerRef: "evt_c", feeCents: 330 }, db);
    const t = await projectTotals(project.id);
    expect(t.gross).toBe(10000);
    expect(t.net).toBe(10000);
  });

  it("never confirms a failed or cancelled donation", async () => {
    const { project, donor } = await setup();
    const d = await donation(donor.id, project.id, 5000);
    await failDonation(d.id, "SANDBOX", "evt_fail", "FAILED", db);
    const r = await confirmDonation({ donationId: d.id, gateway: "SANDBOX", providerRef: "evt_late", feeCents: 0 }, db);
    expect(r.status).toBe("invalid_state");
    expect((await projectTotals(project.id)).gross).toBe(0);
  });

  it("moves the project to FULLY_FUNDED when the gross goal is reached", async () => {
    const { project, donor } = await setup({ goal: 10000 });
    const d = await donation(donor.id, project.id, 10000);
    await confirmDonation({ donationId: d.id, gateway: "SANDBOX", providerRef: "evt_full", feeCents: 0 }, db);
    expect((await db.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe("FULLY_FUNDED");
  });
});

dbDescribe("item sponsorship allocation", () => {
  it("allocates item quantity only on confirmation", async () => {
    const { project, item, donor } = await setup({ itemQty: 10 });
    const d = await donation(donor.id, project.id, 15000, { budgetItemId: item.id, itemQuantity: 3, kind: "ITEM" });
    expect((await db.budgetItem.findUniqueOrThrow({ where: { id: item.id } })).fundedQty).toBe(0);
    await confirmDonation({ donationId: d.id, gateway: "SANDBOX", providerRef: "evt_i", feeCents: 0 }, db);
    expect((await db.budgetItem.findUniqueOrThrow({ where: { id: item.id } })).fundedQty).toBe(3);
  });

  it("prevents over-allocation when two sponsors race for the last units", async () => {
    const { project, item, donor } = await setup({ itemQty: 10, fundedQty: 8 });
    const a = await donation(donor.id, project.id, 10000, { budgetItemId: item.id, itemQuantity: 2, kind: "ITEM" });
    const b = await donation(donor.id, project.id, 10000, { budgetItemId: item.id, itemQuantity: 2, kind: "ITEM" });
    const [ra, rb] = await Promise.all([
      confirmDonation({ donationId: a.id, gateway: "SANDBOX", providerRef: "evt_a", feeCents: 0 }, db),
      confirmDonation({ donationId: b.id, gateway: "SANDBOX", providerRef: "evt_b", feeCents: 0 }, db),
    ]);
    const updated = await db.budgetItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.fundedQty).toBe(10);
    // Both payments are real money and both count; exactly one is moved to general project needs.
    const reallocated = [ra, rb].filter((r) => r.status === "confirmed" && r.itemReallocated);
    expect(reallocated).toHaveLength(1);
    expect((await projectTotals(project.id)).gross).toBe(20000);
  });
});

dbDescribe("refunds", () => {
  it("partial then full refund reduces gross but keeps fees", async () => {
    const { project, donor } = await setup();
    const d = await donation(donor.id, project.id, 10000);
    await confirmDonation({ donationId: d.id, gateway: "SANDBOX", providerRef: "evt_r", feeCents: 320 }, db);
    const r1 = await db.refund.create({ data: { donationId: d.id, amountCents: 4000, reason: "test" } });
    await applyRefund(r1.id, "approver", db);
    let t = await projectTotals(project.id);
    expect(t.gross).toBe(6000);
    expect((await db.donation.findUniqueOrThrow({ where: { id: d.id } })).status).toBe("PARTIALLY_REFUNDED");
    const r2 = await db.refund.create({ data: { donationId: d.id, amountCents: 6000, reason: "test" } });
    await applyRefund(r2.id, "approver", db);
    t = await projectTotals(project.id);
    expect(t.gross).toBe(0);
    expect(t.fees).toBe(320);
    expect((await db.donation.findUniqueOrThrow({ where: { id: d.id } })).status).toBe("REFUNDED");
  });

  it("rejects refunds larger than the refundable amount and double application", async () => {
    const { project, donor } = await setup();
    const d = await donation(donor.id, project.id, 5000);
    await confirmDonation({ donationId: d.id, gateway: "SANDBOX", providerRef: "evt_x", feeCents: 0 }, db);
    const big = await db.refund.create({ data: { donationId: d.id, amountCents: 6000, reason: "too big" } });
    await expect(applyRefund(big.id, "a", db)).rejects.toThrow();
    const ok = await db.refund.create({ data: { donationId: d.id, amountCents: 1000, reason: "ok" } });
    await applyRefund(ok.id, "a", db);
    await expect(applyRefund(ok.id, "a", db)).rejects.toThrow();
    expect((await projectTotals(project.id)).gross).toBe(4000);
  });
});
