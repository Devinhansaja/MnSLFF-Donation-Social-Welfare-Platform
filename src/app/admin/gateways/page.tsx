import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { ADAPTERS } from "@/lib/payments";
import { PageHeader } from "@/components/admin/parts";
import { SubmitButton } from "@/components/forms";
import { toggleGateway } from "@/app/actions/admin/system";
import { card } from "@/components/admin/styles";
import { cn } from "@/lib/format";

export default async function Gateways() {
  const user = await requireStaff("view");
  const rows = await db.paymentGateway.findMany({ orderBy: { sortOrder: "asc" } });
  const manage = can(user.role, "settings.manage");
  return (
    <div className="max-w-4xl">
      <PageHeader title="Payment gateway settings" intro="Activate a provider only after it has approved the organisation for charitable fundraising in USD (and LKR where relevant). Credentials live in server environment variables, never in the database or browser." />
      <ul className="space-y-3">
        {rows.map((g) => {
          const offline = ["BANK_TRANSFER", "MANUAL"].includes(g.code);
          const configured = offline || !!ADAPTERS[g.code]?.isConfigured();
          return (
            <li key={g.code} className={cn(card, "flex flex-wrap items-center justify-between gap-4 p-4")}>
              <div>
                <p className="font-semibold">{g.name} <span className="ml-1 font-mono text-xs text-muted">{g.code}</span></p>
                <p className="text-sm text-muted">{g.description}</p>
                <p className="mt-1 text-xs">
                  <span className={configured ? "text-success" : "text-amber-700"}>{configured ? "Credentials configured" : "Credentials missing"}</span>
                  {!offline && <span className="text-muted"> · {g.sandbox ? "Sandbox / test mode" : "Live mode"}</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", g.enabled ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600")}>{g.enabled ? "Enabled" : "Disabled"}</span>
                {manage && (
                  <form action={toggleGateway}>
                    <input type="hidden" name="code" value={g.code} />
                    <SubmitButton size="sm" variant={g.enabled ? "outline" : "primary"} confirm={`${g.enabled ? "Disable" : "Enable"} ${g.name}?`}>{g.enabled ? "Disable" : "Enable"}</SubmitButton>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
