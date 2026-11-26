import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { verifyReceiptToken } from "@/lib/receipt-token";
import { SimplePdf } from "@/lib/pdf";
import { countryName, date, usd } from "@/lib/format";
import { getSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const token = new URL(req.url).searchParams.get("t");
  const d = await db.donation.findUnique({ where: { reference: ref }, include: { donor: true, project: true, budgetItem: true, transactions: true } });
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Access: signed receipt link, the donor's own account, or finance staff.
  const session = await getSession();
  const allowed = verifyReceiptToken(ref, token) || (session && d.donor.userId === session.uid) || (session && can(session.role, "export"));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(d.status)) return NextResponse.json({ error: "Receipt available after payment is confirmed" }, { status: 409 });

  const s = await getSettings();
  const pdf = await SimplePdf.create(`Donation receipt ${d.reference}`);
  if (d.isDemo) pdf.text("DEMONSTRATION RECORD - NOT A VALID TAX RECEIPT", { bold: true, color: "forest" });
  else if (d.method === "SANDBOX") pdf.text("SANDBOX TEST PAYMENT - NO MONEY WAS CHARGED - NOT A VALID RECEIPT", { bold: true, color: "forest" });
  pdf.title("Official donation receipt");
  pdf.text(`Receipt number: ${d.reference}`, { color: "muted" });
  pdf.text(`Issued: ${date(new Date(), "long")}`, { color: "muted" });
  pdf.gap(14);
  pdf.text("Received with thanks from", { color: "muted", size: 9 });
  pdf.text(d.donor.companyName ? `${d.donor.companyName} (${d.donor.fullName})` : d.donor.fullName, { bold: true, size: 13 });
  pdf.text(`${d.donor.email} - ${countryName(d.donor.country)}`, { color: "muted" });
  pdf.gap(16);
  pdf.rule();
  pdf.gap(6);
  pdf.row("Date of donation", date(d.confirmedAt ?? d.createdAt, "long"));
  pdf.row("Designation", d.project ? `${d.project.title} (${d.project.code})` : "General Fund");
  if (d.budgetItem) pdf.row("Item sponsored", `${d.itemQuantity} x ${d.budgetItem.name}`);
  pdf.row("Frequency", d.frequency === "MONTHLY" ? "Monthly" : "One-time");
  pdf.row("Payment method", d.method.replaceAll("_", " "));
  pdf.row("Donation amount", usd(d.amountCents, { decimals: true }));
  if (d.coveredFeeCents) pdf.row("Processing fee covered by donor", usd(d.coveredFeeCents, { decimals: true }));
  if (d.refundedCents) pdf.row("Refunded", `-${usd(d.refundedCents, { decimals: true })}`);
  pdf.rule();
  pdf.row("Total received (USD)", usd(d.amountCents + d.coveredFeeCents - d.refundedCents, { decimals: true }), { bold: true });
  pdf.gap(20);
  pdf.text("No goods or services were provided in exchange for this contribution.", { size: 9, color: "muted" });
  pdf.text(`${s.orgName}. ${s.registration}`, { size: 9, color: "muted" });
  pdf.text(`${s.address} - ${s.email}`, { size: 9, color: "muted" });
  pdf.footer(`Receipt ${d.reference} - generated ${new Date().toISOString()}`);

  return new NextResponse(Buffer.from(await pdf.bytes()), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receipt-${d.reference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
