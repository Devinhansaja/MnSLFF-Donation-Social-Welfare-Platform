import { NextResponse } from "next/server";
import { getProjectBySlug } from "@/lib/queries";
import { SimplePdf } from "@/lib/pdf";
import { date, num, usd } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProjectBySlug(slug);
  if (!p || !p.isPublic || p.status !== "COMPLETED") return NextResponse.json({ error: "Report not available" }, { status: 404 });
  const f = p.finance;

  const pdf = await SimplePdf.create(`Final report - ${p.title}`);
  if (p.isDemo) pdf.text("DEMONSTRATION RECORD - figures are illustrative only", { bold: true, color: "forest" });
  pdf.title("Final project report");
  pdf.text(p.title, { bold: true, size: 13 });
  pdf.text(`${p.code} - ${p.category.name} - ${p.location}`, { color: "muted" });
  pdf.gap(12);
  pdf.row("Original funding target", usd(f.goal));
  pdf.row("Total donations collected", usd(f.gross));
  pdf.row("Processing fees", usd(f.fees));
  pdf.row("Net funds received", usd(f.net));
  pdf.row("Total actual expenditure", usd(f.expensesPaid));
  pdf.row("Remaining balance", usd(f.available), { bold: true });
  pdf.row("Number of donors", num(p.donorCount));
  pdf.row("Final beneficiary count", num(p.finalBeneficiaries));
  pdf.row("Completion date", date(p.completedAt, "long"));
  pdf.gap(10);
  pdf.text("Achieved objectives", { bold: true, size: 12 });
  pdf.text(p.outcome || "-");
  pdf.gap(8);
  pdf.text("Final impact statement", { bold: true, size: 12 });
  pdf.text(p.impactStatement || "-");
  pdf.gap(12);
  pdf.text("Expenditure", { bold: true, size: 12 });
  pdf.gap(4);
  pdf.table(
    ["Expense", "Category", "Date", "Amount"],
    p.expenses.filter((e) => e.status === "PAID").map((e) => [e.title, e.category, date(e.date), usd(e.amountCents)]),
    [230, 120, 80, 85],
  );
  pdf.gap(10);
  pdf.text("Budget items", { bold: true, size: 12 });
  pdf.gap(4);
  pdf.table(
    ["Item", "Qty", "Unit cost", "Total"],
    p.budgetItems.map((i) => [i.name, String(i.quantity), usd(i.unitCents), usd(i.quantity * i.unitCents)]),
    [260, 60, 100, 95],
  );
  pdf.footer(`Generated ${new Date().toISOString()} - all amounts in USD`);

  return new NextResponse(Buffer.from(await pdf.bytes()), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${p.slug}-final-report.pdf"` },
  });
}
