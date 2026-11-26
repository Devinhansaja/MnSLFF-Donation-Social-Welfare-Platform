import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { date } from "@/lib/format";
import { PageHeader, Empty } from "@/components/admin/parts";
import { card, link } from "@/components/admin/styles";

export default async function Updates() {
  await requireStaff("view");
  const updates = await db.projectUpdate.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { project: { select: { id: true, code: true, title: true } } } });
  return (
    <div>
      <PageHeader title="Project updates" intro="Publish new updates from a project's page — supporters who opted in are notified." />
      {!updates.length ? <Empty>No updates yet.</Empty> : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {updates.map((u) => (
            <li key={u.id} className={`${card} flex gap-4 p-4`}>
              {u.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.image} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0">
                <Link className={link} href={`/admin/projects/${u.project.id}#updates`}>{u.project.code}</Link>
                <p className="font-semibold">{u.title}</p>
                <p className="text-xs text-muted">{date(u.createdAt)}{u.milestone && ` · ${u.milestone}`}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{u.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
