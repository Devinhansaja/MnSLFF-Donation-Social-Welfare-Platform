import crypto from "node:crypto";

/**
 * Modular payment gateway layer. Each adapter knows how to start a hosted
 * checkout and how to verify that provider's webhook. Only SANDBOX, BANK_TRANSFER
 * and MANUAL work out of the box; the others are adapters waiting for merchant
 * credentials and approval, and refuse to run until configured.
 */

export type CheckoutStart = { redirectUrl: string } | { error: string };

export type VerifiedEvent = {
  donationRef: string;
  providerRef: string;
  outcome: "paid" | "failed" | "cancelled";
  feeCents: number;
  raw: string;
};

export interface GatewayAdapter {
  code: string;
  isConfigured(): boolean;
  startCheckout(args: { reference: string; totalCents: number; currency: string; siteUrl: string }): Promise<CheckoutStart>;
  verifyWebhook(body: string, headers: Headers): VerifiedEvent | null;
}

export function hmac(secret: string, body: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Simulated card processor fee used by the sandbox: 2.9% + $0.30 */
export function sandboxFee(totalCents: number) {
  return Math.round(totalCents * 0.029 + 30);
}

const sandbox: GatewayAdapter = {
  code: "SANDBOX",
  isConfigured: () => !!process.env.SANDBOX_WEBHOOK_SECRET,
  async startCheckout({ reference, siteUrl }) {
    return { redirectUrl: `${siteUrl}/checkout/sandbox/${reference}` };
  },
  verifyWebhook(body, headers) {
    const secret = process.env.SANDBOX_WEBHOOK_SECRET;
    const sig = headers.get("x-sandbox-signature") ?? "";
    const ts = Number(headers.get("x-sandbox-timestamp") ?? 0);
    if (!secret || !sig) return null;
    // Reject replays older than 5 minutes.
    if (!ts || Math.abs(Date.now() - ts) > 5 * 60 * 1000) return null;
    if (!safeEqual(sig, hmac(secret, `${ts}.${body}`))) return null;
    const evt = JSON.parse(body) as { reference: string; eventId: string; outcome: VerifiedEvent["outcome"]; totalCents: number };
    return {
      donationRef: evt.reference,
      providerRef: `sandbox_${evt.eventId}`,
      outcome: evt.outcome,
      feeCents: evt.outcome === "paid" ? sandboxFee(evt.totalCents) : 0,
      raw: body,
    };
  },
};

function pendingAdapter(code: string, envKeys: string[]): GatewayAdapter {
  return {
    code,
    isConfigured: () => envKeys.every((k) => !!process.env[k]),
    async startCheckout() {
      return { error: `${code} is not yet activated. Merchant approval and credentials are required.` };
    },
    verifyWebhook() {
      // Implement provider-specific signature verification when credentials are issued.
      return null;
    },
  };
}

export const ADAPTERS: Record<string, GatewayAdapter> = {
  SANDBOX: sandbox,
  STRIPE: pendingAdapter("STRIPE", ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]),
  PAYPAL: pendingAdapter("PAYPAL", ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID"]),
  SAMPATH_IPG: pendingAdapter("SAMPATH_IPG", ["SAMPATH_IPG_MERCHANT_ID", "SAMPATH_IPG_SECRET"]),
  COMBANK_IPG: pendingAdapter("COMBANK_IPG", ["COMBANK_IPG_MERCHANT_ID", "COMBANK_IPG_SECRET"]),
  WEBXPAY: pendingAdapter("WEBXPAY", ["WEBXPAY_PUBLIC_KEY", "WEBXPAY_SECRET"]),
  DIRECTPAY: pendingAdapter("DIRECTPAY", ["DIRECTPAY_MERCHANT_ID", "DIRECTPAY_SECRET"]),
};

export const OFFLINE_METHODS = ["BANK_TRANSFER", "MANUAL"];
