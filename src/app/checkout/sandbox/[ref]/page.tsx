import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { db } from "@/lib/db";
import { usd } from "@/lib/format";
import { sandboxPay } from "@/app/actions/sandbox";
import { SubmitButton } from "@/components/forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sandbox payment", robots: { index: false } };

/** Simulates a provider-hosted payment page. In production this page lives on the gateway's domain. */
export default async function SandboxCheckout({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const d = await db.donation.findUnique({ where: { reference: ref }, include: { project: true } });
  if (!d || d.method !== "SANDBOX") notFound();
  const total = d.amountCents + d.coveredFeeCents;
  const open = ["INITIATED", "PENDING", "PROCESSING"].includes(d.status);

  return (
    <div className="min-h-dvh bg-slate-100">
      <div className="bg-amber-400 px-4 py-2 text-center text-sm font-bold text-slate-900">
        SANDBOX PAYMENT PAGE — test mode. No real card is charged and no real money moves.
      </div>
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Lock className="size-3.5" /> Demo Payments Ltd · hosted checkout</p>
          <p className="mt-4 text-sm text-slate-500">Pay Minnesota Sri Lanka Friendship Foundation</p>
          <p className="font-num text-4xl font-bold text-slate-900">{usd(total, { decimals: true })}</p>
          <p className="mt-1 text-xs text-slate-500">{d.project?.title ?? "General Fund"} · Ref {d.reference}</p>

          {open ? (
            <>
              <div className="mt-6 space-y-3" aria-hidden>
                <div className="rounded-lg border border-slate-200 p-3 font-mono text-sm text-slate-500">4242 4242 4242 4242 <span className="float-right">12/34 · 123</span></div>
                <p className="text-xs text-slate-400">Test card pre-filled. Card details are never sent to the foundation&apos;s servers.</p>
              </div>
              <form action={sandboxPay} className="mt-6 space-y-2">
                <input type="hidden" name="reference" value={d.reference} />
                <SubmitButton className="w-full" size="lg" pendingText="Processing…">Pay {usd(total, { decimals: true })}</SubmitButton>
              </form>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <form action={sandboxPay}>
                  <input type="hidden" name="reference" value={d.reference} />
                  <input type="hidden" name="outcome" value="failed" />
                  <SubmitButton variant="outline" size="sm" className="w-full" pendingText="…">Simulate decline</SubmitButton>
                </form>
                <form action={sandboxPay}>
                  <input type="hidden" name="reference" value={d.reference} />
                  <input type="hidden" name="outcome" value="cancelled" />
                  <SubmitButton variant="quiet" size="sm" className="w-full" pendingText="…">Cancel</SubmitButton>
                </form>
              </div>
            </>
          ) : (
            <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm">This payment session is closed (status: {d.status.toLowerCase()}).</p>
          )}
        </div>
      </div>
    </div>
  );
}
