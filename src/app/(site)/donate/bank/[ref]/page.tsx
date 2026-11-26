import { notFound } from "next/navigation";
import { Landmark } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/queries";
import { Container } from "@/components/ui";
import { BankSlipForm } from "@/components/bank-slip-form";
import { usd } from "@/lib/format";

export const metadata = { title: "Bank transfer", robots: { index: false } };

export default async function BankPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const [d, s] = await Promise.all([db.donation.findUnique({ where: { reference: ref }, include: { project: true, bankTransfer: true } }), getSettings()]);
  if (!d || d.method !== "BANK_TRANSFER") notFound();

  return (
    <Container className="max-w-3xl py-16">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-forest">Bank transfer · pending verification</p>
      <h1 className="font-serif text-4xl text-navy">Complete your transfer</h1>
      <p className="mt-3 text-muted">
        Please transfer <strong className="font-num text-navy">{usd(d.amountCents, { decimals: true })}</strong> for {d.project?.title ?? "the General Fund"} and use
        reference <strong className="font-mono text-navy">{d.reference}</strong>. Your donation is counted once our finance team verifies the transfer.
      </p>

      <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-white p-6">
        <h2 className="flex items-center gap-2 font-serif text-xl text-navy"><Landmark className="size-5 text-forest" /> Bank details</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {[
            ["Bank", s.bankName], ["Account name", s.bankAccountName], ["Account number", s.bankAccountNo],
            ["SWIFT / BIC", s.bankSwift], ["Branch", s.bankBranch], ["Payment reference", d.reference],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-ivory p-3"><dt className="text-xs text-muted">{l}</dt><dd className="font-mono font-semibold text-navy">{v}</dd></div>
          ))}
        </dl>
        {s.bankName?.includes("DEMO") && <p className="mt-3 text-xs font-semibold text-urgent">These are placeholder demo bank details. Do not send money to them.</p>}
      </div>

      <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-white p-6">
        <h2 className="font-serif text-xl text-navy">Already transferred?</h2>
        <p className="mt-1 text-sm text-muted">Send us your transaction reference and (optionally) a photo or PDF of the slip.</p>
        {d.status !== "PENDING" ? (
          <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">This transfer has been processed (status: {d.status.toLowerCase()}).</p>
        ) : (
          <BankSlipForm reference={d.reference} submitted={!!d.bankTransfer} />
        )}
      </div>
    </Container>
  );
}
