import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { listPhotos } from "@/lib/admin-projects";
import { PageHeader, Section } from "@/components/admin/parts";
import { SubmitButton } from "@/components/forms";
import { deleteCategory, saveCategory } from "@/app/actions/admin/projects";
import { card } from "@/components/admin/styles";

export default async function Categories() {
  const user = await requireStaff("view");
  const [cats, photos] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { projects: true } } } }),
    listPhotos(),
  ]);
  const editable = can(user.role, "project.edit");
  const form = (c?: (typeof cats)[number]) => (
    <form action={saveCategory} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <input name="name" defaultValue={c?.name} placeholder="Name" required className="field h-10 !py-1 text-sm" aria-label="Name" />
      <input name="slug" defaultValue={c?.slug} placeholder="url-slug" required className="field h-10 !py-1 text-sm" aria-label="Slug" />
      <input name="description" defaultValue={c?.description} placeholder="Short description" required className="field h-10 !py-1 text-sm sm:col-span-2" aria-label="Description" />
      <select name="image" defaultValue={c?.image ?? photos[0]} className="field h-10 !py-1 text-sm" aria-label="Image">{photos.map((p) => <option key={p} value={p}>{p.split("/").pop()}</option>)}</select>
      <div className="flex gap-2">
        <input name="icon" defaultValue={c?.icon ?? "Heart"} className="field h-10 !py-1 text-sm" aria-label="Lucide icon name" title="Lucide icon name" />
        <input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? cats.length} className="field h-10 w-20 !py-1 text-sm" aria-label="Order" />
      </div>
      <div className="sm:col-span-2"><SubmitButton size="sm">{c ? "Save" : "Add category"}</SubmitButton></div>
    </form>
  );
  return (
    <div className="space-y-6">
      <PageHeader title="Project categories" intro="Categories appear on the homepage and project filters." />
      {editable && <Section title="New category">{form()}</Section>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {cats.map((c) => (
          <div key={c.id} className={`${card} flex gap-4 p-4`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.image} alt="" className="h-24 w-32 shrink-0 rounded-lg object-cover" />
            <div className="flex-1">
              <p className="mb-2 text-xs text-muted">{c._count.projects} project(s)</p>
              {editable ? form(c) : <><p className="font-semibold">{c.name}</p><p className="text-sm text-muted">{c.description}</p></>}
              {can(user.role, "archive") && c._count.projects === 0 && (
                <form action={deleteCategory} className="mt-2"><input type="hidden" name="id" value={c.id} /><SubmitButton size="sm" variant="quiet" confirm={`Delete category ${c.name}?`}>Delete</SubmitButton></form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
