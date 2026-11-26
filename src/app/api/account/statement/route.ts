import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { SimplePdf } from "@/lib/pdf";
import { date, usd } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user?.donor) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const year = Number(new URL(req.url).searchParams.get("year")) || new Date().getFullYear();
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));
  const rows = await db.donation.findMany({
    where: { donorId: user.donor.id, status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] }, confirmedAt: { gte: from, lt: to } },
    orderBy: { confirmedAt: "asc" },
    include: { project: { select: { title: true } } },
  });
  const total = rows.reduce((s, d) => s + d.amountCents + d.coveredFeeCents - d.refundedCents, 0);

  const pdf = await SimplePdf.create(`Annual donation statement ${year}`);
  if (rows.some((r) => r.isDemo)) pdf.text("Contains DEMONSTRATION records - not valid for tax purposes", { bold: true, color: "forest" });
  pdf.title(`Annual donation statement ${year}`);
  pdf.text(user.donor.companyName ? `${user.donor.companyName} (${user.donor.fullName})` : user.donor.fullName, { bold: true, size: 12 });
  pdf.text(`Period: 1 January ${year} - 31 December ${year} - Currency: USD`, { color: "muted" });
  pdf.gap(12);
  pdf.table(
    ["Date", "Reference", "Designation", "Amount"],
    rows.map((d) => [date(d.confirmedAt), d.reference, d.project?.title ?? "General Fund", usd(d.amountCents + d.coveredFeeCents - d.refundedCents, { decimals: true })]),
    [80, 100, 245, 90],
  );
  pdf.gap(8);
  pdf.rule();
  pdf.row(`Total contributions ${year}`, usd(total, { decimals: true }), { bold: true });
  pdf.footer(`Generated ${new Date().toISOString()}`);
  return new NextResponse(Buffer.from(await pdf.bytes()), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="statement-${year}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
