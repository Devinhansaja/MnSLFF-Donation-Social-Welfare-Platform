import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getProjects, STATUS_LABELS } from "@/lib/queries";
import { usd } from "@/lib/format";
import { PageHeader } from "@/components/admin/parts";
import { StatusPill } from "@/components/ui";
import { link, table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Budgets() {
  await requireStaff("view");
  const projects = await getProjects({}, [{ code: "asc" }]);
  const sum = (k: "goal" | "gross" | "fees" | "net" | "expensesPaid" | "commitments" | "available" | "overfunded" | "remainingGross") => projects.reduce((s, p) => s + p.finance[k], 0);
  const cols = ["goal", "gross", "fees", "net", "expensesPaid", "commitments", "available", "remainingGross", "overfunded"] as const;
  const labels = ["Target", "Gross", "Fees", "Net", "Paid exp.", "Commitments", "Available", "Remaining", "Overfunded"];
  return (
    <div>
      <PageHeader title="Project budgets" intro="Restricted project funds. Funds cannot be moved between projects except through an approved, documented adjustment." />
      <div className={tableWrap}>
        <table className={table}>
          <thead><tr><th className={th}>Project</th><th className={th}>Status</th>{labels.map((l) => <th key={l} className={`${th} text-right`}>{l}</th>)}</tr></thead>
          <tbody className={tbody}>
            {projects.map((p) => (
              <tr key={p.id}>
                <td className={td}><Link href={`/admin/projects/${p.id}`} className={link}>{p.code}</Link><p className="max-w-56 truncate text-xs text-muted">{p.title}</p></td>
                <td className={td}><StatusPill status={p.status} label={STATUS_LABELS[p.status]} /></td>
                {cols.map((c) => <td key={c} className={`${td} font-num text-right ${c === "available" && p.finance.available < 0 ? "text-urgent" : ""}`}>{usd(p.finance[c])}</td>)}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-navy/20 font-semibold">
              <td className={td} colSpan={2}>Total</td>
              {cols.map((c) => <td key={c} className={`${td} font-num text-right`}>{usd(sum(c))}</td>)}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
