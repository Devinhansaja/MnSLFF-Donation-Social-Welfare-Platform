import { requireStaff } from "@/lib/auth";
import { getProjects, STATUS_LABELS } from "@/lib/queries";
import { usd } from "@/lib/format";
import { PageHeader } from "@/components/admin/parts";
import { SubmitButton } from "@/components/forms";
import { toggleFeatured } from "@/app/actions/admin/projects";
import { table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Featured() {
  await requireStaff("content.edit");
  const projects = await getProjects({ status: { in: ["FUNDRAISING", "FULLY_FUNDED", "IN_PROGRESS", "COMPLETED"] } }, [{ featured: "desc" }, { code: "asc" }]);
  return (
    <div>
      <PageHeader title="Featured projects" intro="Featured projects appear in the homepage grid. Only published projects are listed." />
      <div className={tableWrap}>
        <table className={table}>
          <thead><tr><th className={th}>Project</th><th className={th}>Status</th><th className={`${th} text-right`}>Raised</th><th className={th}>Featured</th></tr></thead>
          <tbody className={tbody}>
            {projects.map((p) => (
              <tr key={p.id}>
                <td className={td}>{p.code} — {p.title}</td>
                <td className={td}>{STATUS_LABELS[p.status]}{!p.isPublic && " (hidden)"}</td>
                <td className={`${td} font-num text-right`}>{usd(p.finance.gross)} / {usd(p.finance.goal)}</td>
                <td className={td}>
                  <form action={toggleFeatured}><input type="hidden" name="id" value={p.id} /><SubmitButton size="sm" variant={p.featured ? "primary" : "outline"}>{p.featured ? "★ Featured" : "Feature"}</SubmitButton></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
