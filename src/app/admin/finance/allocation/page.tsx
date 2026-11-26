import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { usd } from "@/lib/format";
import { PageHeader } from "@/components/admin/parts";
import { table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Allocation() {
  await requireStaff("view");
  const [groups, projects] = await Promise.all([
    db.ledgerEntry.groupBy({ by: ["projectId", "type"], _sum: { amountCents: true } }),
    db.project.findMany({ select: { id: true, code: true, title: true }, orderBy: { code: "asc" } }),
  ]);
  const funds = [...projects.map((p) => ({ id: p.id as string | null, label: `${p.code} ${p.title}` })), { id: null, label: "General fund (unrestricted)" }];
  const types = ["DONATION", "FEE", "REFUND", "EXPENSE", "ADJUSTMENT", "TRANSFER"];
  const val = (pid: string | null, t: string) => groups.find((g) => g.projectId === pid && g.type === t)?._sum.amountCents ?? 0;
  return (
    <div>
      <PageHeader title="Fund allocation" intro="Ledger movements per fund. Project funds are restricted; the general fund covers administrative costs. Transfers between restricted funds require an approved adjustment." />
      <div className={tableWrap}>
        <table className={table}>
          <thead><tr><th className={th}>Fund</th>{types.map((t) => <th key={t} className={`${th} text-right`}>{t.toLowerCase()}</th>)}<th className={`${th} text-right`}>Balance</th></tr></thead>
          <tbody className={tbody}>
            {funds.map((f) => {
              const bal = types.reduce((s, t) => s + val(f.id, t), 0);
              return (
                <tr key={f.id ?? "general"}>
                  <td className={td}>{f.label}</td>
                  {types.map((t) => <td key={t} className={`${td} font-num text-right`}>{usd(val(f.id, t))}</td>)}
                  <td className={`${td} font-num text-right font-semibold ${bal < 0 ? "text-urgent" : ""}`}>{usd(bal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
