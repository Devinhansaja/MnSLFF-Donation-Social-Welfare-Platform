"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/site-url";
import { hmac } from "@/lib/payments";

/**
 * Plays the role of the payment provider's servers: it sends an HMAC-signed
 * webhook to our own /api/webhooks/sandbox endpoint, exactly as a real
 * gateway would. The donor's browser never marks anything as paid.
 */
export async function sandboxPay(formData: FormData) {
  const reference = String(formData.get("reference") ?? "");
  const outcome = String(formData.get("outcome") ?? "paid") as "paid" | "failed" | "cancelled";
  const donation = await db.donation.findUnique({ where: { reference } });
  if (!donation || donation.method !== "SANDBOX") redirect("/donate");

  const secret = process.env.SANDBOX_WEBHOOK_SECRET!;
  const body = JSON.stringify({
    eventId: crypto.randomUUID(),
    reference,
    outcome,
    totalCents: donation.amountCents + donation.coveredFeeCents,
  });
  const ts = Date.now();
  const site = await siteUrl();
  try {
    await fetch(`${site}/api/webhooks/sandbox`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sandbox-timestamp": String(ts), "x-sandbox-signature": hmac(secret, `${ts}.${body}`) },
      body,
      cache: "no-store",
    });
  } catch (e) {
    console.error("[sandbox] webhook delivery failed", e);
  }
  redirect(outcome === "cancelled" ? `/donate/success/${reference}?cancelled=1` : `/donate/success/${reference}`);
}
