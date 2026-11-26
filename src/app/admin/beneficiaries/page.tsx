import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { getProjects, STATUS_LABELS } from "@/lib/queries";
import { num } from "@/lib/format";
import { type SP } from "@/lib/admin-utils";
import { PageHeader, Filters, Select, StatCard, Empty } from "@/components/admin/parts";
import { StatusPill } from "@/components/ui";
import { link, table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Beneficiaries({ searchParams }: { searchParams: SP }) {
  await requireStaff("view");
  const sp = await searchParams;
  const where: Prisma.ProjectWhereInput =
    sp.type === "family" ? { OR: [{ beneficiaryType: { contains: "amil" } }, { category: { slug: { in: ["family-support", "housing-development", "food-distribution"] } } }] }
      : sp.type === "school" ? { OR: [{ beneficiaryType: { contains: "chool" } }, { category: { slug: { in: ["school-development", "childrens-education"] } } }] }
        : sp.type === "individual" ? { OR: [{ beneficiaryType: { contains: "atient" } }, { beneficiaryType: { contains: "tudent" } }, { category: { slug: { in: ["medical-assistance", "disability-support", "elderly-care"] } } }] }
          : {};
  const projects = await getProjects(where, [{ code: "asc" }]);
  const sum = (k: "families" | "children" | "students" | "elderly" | "directBeneficiaries" | "indirectBeneficiaries") => projects.reduce((s, p) => s + p[k], 0);
  const title = sp.type === "family" ? "Families" : sp.type === "school" ? "Schools" : sp.type === "individual" ? "Individuals" : "All beneficiaries";
  return (
    <div>
      <PageHeader title={title} intro="Aggregated, anonymised beneficiary figures per project. Private beneficiary records live in each project's admin-only notes and are never published." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
        <StatCard label="Families" value={num(sum("families"))} /><StatCard label="Children" value={num(sum("children"))} /><StatCard label="Students" value={num(sum("students"))} />
        <StatCard label="Elderly" value={num(sum("elderly"))} /><StatCard label="Direct" value={num(sum("directBeneficiaries"))} /><StatCard label="Indirect" value={num(sum("indirectBeneficiaries"))} />
      </div>
      <Filters action="/admin/beneficiaries">
        <Select name="type" label="Beneficiary group" value={sp.type} options={[["family", "Families"], ["school", "Schools"], ["individual", "Individuals"]]} />
      </Filters>
      {!projects.length ? <Empty>No projects in this group.</Empty> : (
        <div className={tableWrap}>
          <table className={table}>
            <thead><tr><th className={th}>Project</th><th className={th}>Beneficiary type</th><th className={th}>Location</th>{["Families", "Children", "Students", "Elderly", "Direct", "Indirect"].map((h) => <th key={h} className={`${th} text-right`}>{h}</th>)}<th className={th}>Status</th></tr></thead>
            <tbody className={tbody}>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className={td}><Link className={link} href={`/admin/projects/${p.id}`}>{p.code}</Link><p className="max-w-52 truncate text-xs text-muted">{p.title}</p></td>
                  <td className={td}>{p.beneficiaryType || "—"}</td>
                  <td className={td}>{p.location}</td>
                  {[p.families, p.children, p.students, p.elderly, p.directBeneficiaries, p.indirectBeneficiaries].map((v, i) => <td key={i} className={`${td} font-num text-right`}>{num(v)}</td>)}
                  <td className={td}><StatusPill status={p.status} label={STATUS_LABELS[p.status]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
