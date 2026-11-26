import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { date } from "@/lib/format";
import { PageHeader, Empty } from "@/components/admin/parts";
import { SubmitButton } from "@/components/forms";
import { markNotifications } from "@/app/actions/admin/system";
import { card } from "@/components/admin/styles";
import { cn } from "@/lib/format";

export default async function Notifications() {
  const user = await requireStaff("view");
  const rows = await db.notification.findMany({ where: { OR: [{ userId: null }, { userId: user.id }] }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="max-w-3xl">
      <PageHeader title="Notifications" intro="In-app staff notifications. Email delivery uses the configured email provider; WhatsApp is not connected." actions={rows.some((r) => !r.read) ? <form action={markNotifications}><SubmitButton size="sm" variant="outline">Mark all read</SubmitButton></form> : undefined} />
      {!rows.length ? <Empty>No notifications.</Empty> : (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li key={n.id} className={cn(card, "flex items-start justify-between gap-3 p-4", !n.read && "border-l-4 border-l-gold")}>
              <div>
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-muted">{n.body}</p>
                <p className="mt-1 text-xs text-muted">{date(n.createdAt)}</p>
              </div>
              {!n.read && <form action={markNotifications}><input type="hidden" name="id" value={n.id} /><SubmitButton size="sm" variant="quiet">Mark read</SubmitButton></form>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
