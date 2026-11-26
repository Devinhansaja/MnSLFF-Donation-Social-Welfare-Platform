import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPublicProjects, getSiteStats } from "@/lib/queries";
import { SimplePdf } from "@/lib/pdf";
import { date, usd } from "@/lib/format";

export const dynamic = "force-dynamic";

const csvCell = (v: string | number) => {
  const s = String(v);
  // Prevent spreadsheet formula injection and escape quotes.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};
const toCsv = (rows: (string | number)[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
const dollars = (c: number) => (c / 100).toFixed(2);

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const format = new URL(req.url).searchParams.get("format") ?? "csv";
  const stamp = new Date().toISOString().slice(0, 10);

  if (type === "projects") {
    const [projects, s] = await Promise.all([getPublicProjects(), getSiteStats()]);
    if (format === "pdf") {
      const pdf = await SimplePdf.create("Project financial summary");
      if (projects.some((p) => p.isDemo)) pdf.text("Contains DEMONSTRATION data - not real financial results", { bold: true, color: "forest" });
      pdf.title("Project financial summary");
      pdf.text(`Reporting date: ${date(new Date(), "long")} - Currency: USD`, { color: "muted" });
      pdf.gap(10);
      pdf.row("Gross donations received", usd(s.grossReceived));
      pdf.row("Refunds", usd(s.refunds));
      pdf.row("Processing fees", usd(s.fees));
      pdf.row("Net donations received", usd(s.net), { bold: true });
      pdf.row("Project expenses paid", usd(s.projectExpenses));
      pdf.row("Administrative expenses", usd(s.adminExpenses));
      pdf.row("Available fund balance", usd(s.available), { bold: true });
      pdf.gap(10);
      pdf.table(
        ["Project", "Goal", "Gross", "Net", "Spent", "Balance"],
        projects.map((p) => [p.title, usd(p.goalCents), usd(p.finance.gross), usd(p.finance.net), usd(p.finance.expensesPaid), usd(p.finance.available)]),
        [195, 64, 64, 64, 64, 64],
      );
      pdf.footer(`Generated ${new Date().toISOString()}`);
      return new NextResponse(Buffer.from(await pdf.bytes()), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="project-summary-${stamp}.pdf"` } });
    }
    const rows: (string | number)[][] = [
      ["Report", "Project financial summary"], ["Reporting date", stamp], ["Currency", "USD"], [],
      ["Project ID", "Title", "Status", "Goal", "Gross collected", "Fees", "Net", "Expenses paid", "Commitments", "Available balance", "Remaining", "Percent funded", "Demo"],
      ...projects.map((p) => [p.code, p.title, p.status, dollars(p.goalCents), dollars(p.finance.gross), dollars(p.finance.fees), dollars(p.finance.net), dollars(p.finance.expensesPaid), dollars(p.finance.commitments), dollars(p.finance.available), dollars(p.finance.remainingGross), p.finance.percent, p.isDemo ? "yes" : "no"]),
    ];
    return new NextResponse("﻿" + toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="project-summary-${stamp}.csv"` } });
  }

  if (type === "expenses") {
    const expenses = await db.expense.findMany({ where: { isPublic: true, status: { in: ["PAID", "APPROVED"] } }, orderBy: { date: "asc" }, include: { project: { select: { code: true, title: true } } } });
    const rows: (string | number)[][] = [
      ["Report", "Public expense records"], ["Reporting date", stamp], ["Currency", "USD"], [],
      ["Date", "Project", "Title", "Category", "Status", "Amount", "Administrative", "Demo"],
      ...expenses.map((e) => [e.date.toISOString().slice(0, 10), e.project ? `${e.project.code} ${e.project.title}` : "General", e.title, e.category, e.status, dollars(e.amountCents), e.administrative ? "yes" : "no", e.isDemo ? "yes" : "no"]),
    ];
    return new NextResponse("﻿" + toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="public-expenses-${stamp}.csv"` } });
  }

  return NextResponse.json({ error: "Unknown report" }, { status: 404 });
}
