import { randomUUID } from "node:crypto";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { COUNTRIES, usd } from "@/lib/format";
import { PageHeader } from "@/components/admin/parts";
import { SubmitButton } from "@/components/forms";
import { recordManualDonation } from "@/app/actions/admin/donations";
import { cardPad } from "@/components/admin/styles";

export default async function NewManualDonation() {
  await requireStaff("payment.record");
  const projects = await db.project.findMany({
    where: { status: { notIn: ["CANCELLED", "CLOSED", "DRAFT"] } },
    orderBy: { code: "asc" },
    include: { budgetItems: { where: { sponsorable: true }, orderBy: { sortOrder: "asc" } } },
  });
  return (
    <div className="max-w-4xl">
      <PageHeader title="Add manual donation" intro="For cash, cheques or transfers received outside online checkout. It is saved as PENDING and only counts after a different finance staff member verifies it." />
      <form action={recordManualDonation} className={`${cardPad} grid grid-cols-1 gap-4 md:grid-cols-2`}>
        <input type="hidden" name="idempotencyKey" value={randomUUID()} />
        <h2 className="md:col-span-2 font-semibold">Donor</h2>
        <div><label className="label" htmlFor="m-name">Full name *</label><input id="m-name" name="fullName" required className="field" /></div>
        <div><label className="label" htmlFor="m-email">Email *</label><input id="m-email" name="email" type="email" required className="field" /></div>
        <div>
          <label className="label" htmlFor="m-country">Country *</label>
          <select id="m-country" name="country" required className="field" defaultValue="US">
            {Object.entries(COUNTRIES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="m-type">Donor type</label>
          <select id="m-type" name="donorType" className="field"><option value="INDIVIDUAL">Individual</option><option value="CORPORATE">Corporate</option><option value="ORGANIZATION">Organization</option></select>
        </div>
        <div className="md:col-span-2"><label className="label" htmlFor="m-co">Company name (optional)</label><input id="m-co" name="companyName" className="field" /></div>

        <h2 className="md:col-span-2 mt-2 font-semibold">Donation</h2>
        <div className="md:col-span-2">
          <label className="label" htmlFor="m-proj">Project</label>
          <select id="m-proj" name="projectId" className="field">
            <option value="">General foundation fund</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.title}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="m-item">Sponsored item (optional — must belong to the chosen project)</label>
          <select id="m-item" name="budgetItemId" className="field">
            <option value="">None — whole project</option>
            {projects.flatMap((p) => p.budgetItems.filter((i) => i.quantity > i.fundedQty).map((i) => (
              <option key={i.id} value={i.id}>{p.code}: {i.name} ({i.quantity - i.fundedQty} left @ {usd(i.unitCents)})</option>
            )))}
          </select>
        </div>
        <div><label className="label" htmlFor="m-qty">Item quantity</label><input id="m-qty" name="itemQuantity" type="number" min={0} defaultValue={0} className="field" /></div>
        <div><label className="label" htmlFor="m-amt">Amount received *</label><input id="m-amt" name="amount" type="number" step="0.01" min="0.01" required className="field" /><p className="mt-1 text-xs text-muted">Ignored for item sponsorships (quantity × unit cost is used).</p></div>
        <div>
          <label className="label" htmlFor="m-cur">Currency</label>
          <select id="m-cur" name="originalCurrency" className="field"><option value="USD">USD</option><option value="LKR">LKR (converted at latest rate)</option></select>
        </div>
        <div>
          <label className="label" htmlFor="m-method">Method</label>
          <select id="m-method" name="method" className="field"><option value="MANUAL">Cash / cheque (manual)</option><option value="BANK_TRANSFER">Bank transfer</option></select>
        </div>
        <div><label className="label" htmlFor="m-ref">Bank / receipt reference</label><input id="m-ref" name="bankRef" className="field" /></div>
        <div className="md:col-span-2"><label className="label" htmlFor="m-msg">Donor message</label><textarea id="m-msg" name="message" rows={2} className="field" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="anonymous" className="size-4 accent-forest" /> Anonymous donation</label>
        <div className="md:col-span-2"><SubmitButton confirm="Record this donation as pending verification?">Record donation</SubmitButton></div>
      </form>
    </div>
  );
}
