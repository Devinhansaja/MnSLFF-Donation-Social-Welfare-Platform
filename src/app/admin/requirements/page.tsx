import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { usd } from "@/lib/format";
import { type SP } from "@/lib/admin-utils";
import { PageHeader, Filters, Select, Empty } from "@/components/admin/parts";
import { link, table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Requirements({ searchParams }: { searchParams: SP }) {
  await requireStaff("view");
  const sp = await searchParams;
  const [items, projects] = await Promise.all([
    db.budgetItem.findMany({
      where: { ...(sp.project ? { projectId: sp.project } : {}), ...(sp.open ? { sponsorable: true } : {}) },
      orderBy: [{ project: { code: "asc" } }, { sortOrder: "asc" }],
      include: { project: { select: { id: true, code: true, title: true } } },
    }),
    db.project.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true } }),
  ]);
  const rows = sp.open ? items.filter((i) => i.quantity > i.fundedQty) : items;
  return (
    <div>
      <PageHeader title="Project requirements" intro="Itemised budgets across all projects. Funded quantities only increase when a sponsorship payment is confirmed. Edit items through each project's wizard (Budget step)." />
      <Filters action="/admin/requirements">
        <Select name="project" label="Project" value={sp.project} options={projects.map((p) => [p.id, p.code])} />
        <Select name="open" label="Show" value={sp.open} options={[["1", "Open for sponsorship only"]]} />
      </Filters>
      {!rows.length ? <Empty>No budget items.</Empty> : (
        <div className={tableWrap}>
          <table className={table}>
            <thead><tr><th className={th}>Project</th><th className={th}>Item</th><th className={`${th} text-right`}>Qty</th><th className={`${th} text-right`}>Funded</th><th className={`${th} text-right`}>Remaining</th><th className={`${th} text-right`}>Unit</th><th className={`${th} text-right`}>Total</th><th className={`${th} text-right`}>Remaining $</th></tr></thead>
            <tbody className={tbody}>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td className={td}><Link className={link} href={`/admin/projects/${i.project.id}`}>{i.project.code}</Link></td>
                  <td className={td}>{i.name}{!i.sponsorable && <span className="ml-1 text-xs text-muted">(not sponsorable)</span>}</td>
                  <td className={`${td} font-num text-right`}>{i.quantity}</td>
                  <td className={`${td} font-num text-right`}>{i.fundedQty}</td>
                  <td className={`${td} font-num text-right`}>{i.quantity - i.fundedQty}</td>
                  <td className={`${td} font-num text-right`}>{usd(i.unitCents)}</td>
                  <td className={`${td} font-num text-right`}>{usd(i.unitCents * i.quantity)}</td>
                  <td className={`${td} font-num text-right`}>{usd(i.unitCents * (i.quantity - i.fundedQty))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
