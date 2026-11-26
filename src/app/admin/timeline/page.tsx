import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { date } from "@/lib/format";
import { type SP } from "@/lib/admin-utils";
import { PageHeader, Filters, Select } from "@/components/admin/parts";
import { toggleMilestone } from "@/app/actions/admin/projects";
import { card, link } from "@/components/admin/styles";

export default async function Timeline({ searchParams }: { searchParams: SP }) {
  const user = await requireStaff("view");
  const sp = await searchParams;
  const projects = await db.project.findMany({
    where: sp.project ? { id: sp.project } : { status: { notIn: ["CANCELLED", "CLOSED"] } },
    orderBy: { code: "asc" },
    include: { milestones: { orderBy: { sortOrder: "asc" } } },
  });
  const all = await db.project.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true } });
  const back = sp.project ? `/admin/timeline?project=${sp.project}` : "/admin/timeline";
  return (
    <div>
      <PageHeader title="Project timeline" intro="Milestone progress across projects. Add or reorder milestones in the project wizard (Timeline step)." />
      <Filters action="/admin/timeline"><Select name="project" label="Project" value={sp.project} options={all.map((p) => [p.id, p.code])} /></Filters>
      <div className="space-y-4">
        {projects.map((p) => {
          const done = p.milestones.filter((m) => m.done).length;
          return (
            <div key={p.id} className={`${card} p-5`}>
              <div className="mb-3 flex items-center justify-between">
                <Link className={link} href={`/admin/projects/${p.id}`}>{p.code} — {p.title}</Link>
                <span className="text-xs text-muted">{done}/{p.milestones.length} complete</span>
              </div>
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-forest-100"><div className="h-full bg-forest" style={{ width: `${p.milestones.length ? (done / p.milestones.length) * 100 : 0}%` }} /></div>
              <ol className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {p.milestones.map((m) => (
                  <li key={m.id} className={`min-w-40 rounded-lg border p-2.5 text-xs ${m.done ? "border-forest/30 bg-forest-50 dark:bg-forest/20" : "border-line dark:border-[#24384a]"}`}>
                    <p className="font-semibold">{m.done ? "✓ " : ""}{m.title}</p>
                    <p className="text-muted">{date(m.date)}</p>
                    {can(user.role, "project.edit") && (
                      <form action={toggleMilestone} className="mt-1"><input type="hidden" name="id" value={m.id} /><input type="hidden" name="back" value={back} /><button className="text-forest underline">{m.done ? "Undo" : "Mark done"}</button></form>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}
