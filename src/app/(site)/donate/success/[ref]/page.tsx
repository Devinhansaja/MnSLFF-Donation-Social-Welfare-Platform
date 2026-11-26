import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Download, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { Container, btn } from "@/components/ui";
import { receiptToken } from "@/lib/receipt-token";
import { usd } from "@/lib/format";
import { AutoRefresh } from "@/components/auto-refresh";

export const metadata = { title: "Thank you", robots: { index: false } };

export default async function SuccessPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ cancelled?: string }> }) {
  const { ref } = await params;
  const sp = await searchParams;
  const d = await db.donation.findUnique({ where: { reference: ref }, include: { project: true, budgetItem: true, donor: true } });
  if (!d) notFound();

  // Status comes from the database, which only the verified webhook or finance staff can change.
  const paid = ["PAID", "PARTIALLY_REFUNDED"].includes(d.status);
  const failed = ["FAILED", "CANCELLED"].includes(d.status);
  const waiting = !paid && !failed;

  return (
    <Container className="max-w-2xl py-20 text-center">
      {paid && <CheckCircle2 className="mx-auto size-16 text-success" />}
      {failed && <XCircle className="mx-auto size-16 text-urgent" />}
      {waiting && <Clock className="mx-auto size-16 text-gold" />}

      <h1 className="mt-6 font-serif text-4xl text-navy">
        {paid ? `Thank you, ${d.donor.fullName.split(" ")[0]}!` : failed ? (sp.cancelled || d.status === "CANCELLED" ? "Payment cancelled" : "Payment not completed") : "Confirming your payment…"}
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-muted">
        {paid && <>Your gift of <strong className="font-num text-navy">{usd(d.amountCents)}</strong> to <strong className="text-navy">{d.project?.title ?? "the General Fund"}</strong> is confirmed{d.budgetItem && <> ({d.itemQuantity} × {d.budgetItem.name})</>}. A receipt has been emailed to you.</>}
        {failed && "No money was taken. You can try again with the same or a different payment method."}
        {waiting && "We're waiting for the payment provider to confirm. This page updates automatically — totals change only after confirmation."}
      </p>

      <div className="mx-auto mt-8 max-w-sm rounded-[var(--radius-card)] border border-line bg-white p-5 text-left text-sm">
        <div className="flex justify-between"><span className="text-muted">Reference</span><span className="font-mono font-semibold">{d.reference}</span></div>
        <div className="mt-2 flex justify-between"><span className="text-muted">Amount</span><span className="font-num font-semibold">{usd(d.amountCents + d.coveredFeeCents, { decimals: true })}</span></div>
        <div className="mt-2 flex justify-between"><span className="text-muted">Status</span><span className="font-semibold">{d.status.replaceAll("_", " ").toLowerCase()}</span></div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {paid && <a href={`/api/receipts/${d.reference}?t=${receiptToken(d.reference)}`} className={btn("primary")}><Download className="size-4" /> Download receipt (PDF)</a>}
        {failed && <Link href={d.project ? `/donate?project=${d.project.slug}` : "/donate"} className={btn("primary")}>Try again</Link>}
        {d.project && <Link href={`/projects/${d.project.slug}`} className={btn("outline")}>Back to project</Link>}
        <Link href="/register" className={btn("quiet")}>Create a donor account</Link>
      </div>
      {waiting && <AutoRefresh seconds={3} />}
    </Container>
  );
}
