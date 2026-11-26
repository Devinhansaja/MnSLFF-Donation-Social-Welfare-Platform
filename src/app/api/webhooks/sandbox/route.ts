import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ADAPTERS } from "@/lib/payments";
import { confirmDonation, failDonation } from "@/lib/donations";
import { onDonationConfirmed } from "@/lib/donation-events";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const evt = ADAPTERS.SANDBOX.verifyWebhook(body, req.headers);
  if (!evt) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  const donation = await db.donation.findUnique({ where: { reference: evt.donationRef } });
  if (!donation || donation.method !== "SANDBOX") return NextResponse.json({ error: "unknown donation" }, { status: 404 });

  if (evt.outcome !== "paid") {
    await failDonation(donation.id, "SANDBOX", evt.providerRef, evt.outcome === "cancelled" ? "CANCELLED" : "FAILED");
    return NextResponse.json({ received: true });
  }

  // Amount check: the provider must report exactly what we asked it to charge.
  const parsed = JSON.parse(evt.raw) as { totalCents: number };
  if (parsed.totalCents !== donation.amountCents + donation.coveredFeeCents) {
    return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
  }

  const result = await confirmDonation({
    donationId: donation.id,
    gateway: "SANDBOX",
    providerRef: evt.providerRef,
    feeCents: evt.feeCents,
    rawPayload: evt.raw,
  });
  if (result.status === "confirmed") await onDonationConfirmed(donation.id);
  return NextResponse.json({ received: true, result: result.status });
}
