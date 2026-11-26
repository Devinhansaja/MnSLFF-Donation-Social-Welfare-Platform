import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { listPhotos, wizardInitial } from "@/lib/admin-projects";
import { type SP } from "@/lib/admin-utils";
import { PageHeader } from "@/components/admin/parts";
import { ProjectWizard } from "@/components/admin/project-wizard";

export default async function NewProject({ searchParams }: { searchParams: SP }) {
  await requireStaff("project.create");
  const sp = await searchParams;
  const [initial, categories, photos] = await Promise.all([
    wizardInitial(undefined, sp),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    listPhotos(),
  ]);
  return (
    <div>
      <PageHeader title="Add new project" intro={sp.fromApp ? `Prefilled from assistance application ${sp.fromApp}.` : "Projects start as drafts. Publishing requires verification by another staff member."} />
      <ProjectWizard initial={initial!} categories={categories} photos={photos} />
    </div>
  );
}
