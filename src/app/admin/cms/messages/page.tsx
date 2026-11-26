import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { date } from "@/lib/format";
import { PageHeader, Empty } from "@/components/admin/parts";
import { SubmitButton } from "@/components/forms";
import { deleteMessage } from "@/app/actions/admin/system";
import { card, link } from "@/components/admin/styles";

export default async function Messages() {
  await requireStaff("content.edit");
  const rows = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <PageHeader title="Contact messages" intro="Messages from the public contact form." />
      {!rows.length ? <Empty>No messages yet.</Empty> : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id} className={`${card} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{m.subject}</p>
                  <p className="text-xs text-muted">{m.name} · <a className={link} href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + m.subject)}`}>{m.email}</a> · {date(m.createdAt)}</p>
                </div>
                <form action={deleteMessage}><input type="hidden" name="id" value={m.id} /><SubmitButton size="sm" variant="quiet" confirm="Delete this message?">Delete</SubmitButton></form>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
