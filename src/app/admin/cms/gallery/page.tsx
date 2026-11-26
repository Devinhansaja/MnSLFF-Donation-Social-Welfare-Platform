import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { listPhotos } from "@/lib/admin-projects";
import { PageHeader, Section } from "@/components/admin/parts";
import { link } from "@/components/admin/styles";

export default async function Gallery() {
  await requireStaff("content.edit");
  const [photos, media] = await Promise.all([
    listPhotos(),
    db.media.findMany({ include: { project: { select: { id: true, code: true } } }, orderBy: [{ projectId: "asc" }, { sortOrder: "asc" }] }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Gallery" intro="Photo library (public/images/photos) and where each image is used. Add project photos through the project wizard's Media step. To add new photos, place optimised JPGs in public/images/photos." />
      <Section title={`Photo library (${photos.length})`}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
          {photos.map((p) => {
            const uses = media.filter((m) => m.url === p);
            return (
              <figure key={p}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="aspect-square w-full rounded-lg object-cover" loading="lazy" />
                <figcaption className="mt-1 truncate text-[11px] text-muted">{p.split("/").pop()} · {uses.length} use(s)</figcaption>
              </figure>
            );
          })}
        </div>
      </Section>
      <Section title="Project media">
        <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {media.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              {m.kind === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="h-10 w-14 rounded object-cover" />
              ) : <span className="rounded bg-navy px-2 text-xs text-white">VIDEO</span>}
              <Link className={link} href={`/admin/projects/${m.project.id}/edit`}>{m.project.code}</Link>
              <span className="text-xs text-muted">{m.stage.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
