import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { REPORT_TYPES } from "@/lib/reports";
import { PageHeader } from "@/components/admin/parts";
import { card } from "@/components/admin/styles";

export default async function Reports() {
  const user = await requireStaff("view");
  const allowed = can(user.role, "export");
  const types = Object.entries(REPORT_TYPES).filter(([k]) => k !== "subscribers");
  return (
    <div>
      <PageHeader title="Reports & exports" intro="Every report states its period and currency (USD). Cash-flow reports include opening balance, transactions and closing balance from the ledger. Exports are logged in the audit trail." />
      {!allowed && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Your role cannot export reports. Ask a Finance Manager or Auditor.</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {types.map(([key, t]) => (
          <form key={key} action={`/api/admin/reports/${key}`} method="get" className={`${card} flex flex-col gap-3 p-5`}>
            <p className="font-semibold">{t.label}</p>
            {t.ranged ? (
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label" htmlFor={`${key}-from`}>From</label><input id={`${key}-from`} type="date" name="from" className="field h-9 !py-1 text-sm" /></div>
                <div><label className="label" htmlFor={`${key}-to`}>To</label><input id={`${key}-to`} type="date" name="to" className="field h-9 !py-1 text-sm" /></div>
                <p className="col-span-2 text-xs text-muted">Leave blank for the current {t.defaultRange}.</p>
              </div>
            ) : <p className="text-xs text-muted">Current position (all dates).</p>}
            <div className="mt-auto flex gap-2">
              {(["pdf", "xlsx", "csv"] as const).map((f) => (
                <button key={f} name="format" value={f} disabled={!allowed} className="flex-1 rounded-full border border-forest/30 py-2 text-xs font-bold uppercase text-forest hover:bg-forest hover:text-white disabled:opacity-40">
                  {f}
                </button>
              ))}
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
