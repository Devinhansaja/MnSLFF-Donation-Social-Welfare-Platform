import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { listPhotos, wizardInitial } from "@/lib/admin-projects";
import { PageHeader } from "@/components/admin/parts";
import { ProjectWizard } from "@/components/admin/project-wizard";

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("project.edit");
  const { id } = await params;
  const [initial, categories, photos] = await Promise.all([
    wizardInitial(id),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    listPhotos(),
  ]);
  if (!initial) notFound();
  return (
    <div>
      <PageHeader title={`Edit ${initial.code}`} intro={initial.values.title} />
      <ProjectWizard initial={initial} categories={categories} photos={photos} />
    </div>
  );
}
