import { describe, expect, it } from "vitest";
import { ADAPTERS, hmac } from "./payments";
import { can, canApproveRequest } from "./rbac";

const secret = "test-sandbox-secret";
const sign = (body: string, ts = Date.now(), key = secret) =>
  new Headers({ "x-sandbox-timestamp": String(ts), "x-sandbox-signature": hmac(key, `${ts}.${body}`) });
const body = JSON.stringify({ eventId: "e1", reference: "DN-1", outcome: "paid", totalCents: 10000 });

describe("sandbox webhook verification", () => {
  it("accepts a correctly signed event and computes the fee", () => {
    const evt = ADAPTERS.SANDBOX.verifyWebhook(body, sign(body));
    expect(evt?.donationRef).toBe("DN-1");
    expect(evt?.providerRef).toBe("sandbox_e1");
    expect(evt?.feeCents).toBe(320);
  });
  it("rejects bad signatures, tampered bodies and stale timestamps", () => {
    expect(ADAPTERS.SANDBOX.verifyWebhook(body, sign(body, Date.now(), "wrong-secret"))).toBeNull();
    expect(ADAPTERS.SANDBOX.verifyWebhook(body.replace("10000", "1"), sign(body))).toBeNull();
    expect(ADAPTERS.SANDBOX.verifyWebhook(body, sign(body, Date.now() - 10 * 60 * 1000))).toBeNull();
    expect(ADAPTERS.SANDBOX.verifyWebhook(body, new Headers())).toBeNull();
  });
  it("unconfigured real gateways refuse to start checkout", async () => {
    expect(ADAPTERS.STRIPE.isConfigured()).toBe(false);
    const r = await ADAPTERS.STRIPE.startCheckout({ reference: "x", totalCents: 100, currency: "USD", siteUrl: "" });
    expect("error" in r).toBe(true);
  });
});

describe("permissions and separation of duties", () => {
  it("grants permissions by role", () => {
    expect(can("FINANCE_MANAGER", "refund")).toBe(true);
    expect(can("FINANCE_OFFICER", "refund")).toBe(false);
    expect(can("AUDITOR", "export")).toBe(true);
    expect(can("AUDITOR", "payment.verify")).toBe(false);
    expect(can("DONOR", "view")).toBe(false);
    expect(can(undefined, "view")).toBe(false);
  });
  it("never lets the requester approve their own sensitive request", () => {
    const req = { requestedById: "u1", type: "REFUND" };
    expect(canApproveRequest({ id: "u1", role: "SUPER_ADMIN" }, req)).toBe(false);
    expect(canApproveRequest({ id: "u2", role: "FINANCE_MANAGER" }, req)).toBe(true);
    expect(canApproveRequest({ id: "u2", role: "FINANCE_OFFICER" }, req)).toBe(false);
    expect(canApproveRequest({ id: "u2", role: "PROJECT_MANAGER" }, { requestedById: "u1", type: "EXPENSE_PAYMENT" })).toBe(false);
  });
});
