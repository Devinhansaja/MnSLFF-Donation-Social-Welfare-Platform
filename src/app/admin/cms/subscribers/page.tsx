import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { date } from "@/lib/format";
import { PageHeader, Empty } from "@/components/admin/parts";
import { btn } from "@/components/ui";
import { table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Subscribers() {
  await requireStaff("content.edit");
  const rows = await db.subscriber.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <PageHeader title="Newsletter subscribers" intro={`${rows.length} subscriber(s).`} actions={
        // eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page
        <a href="/api/admin/reports/subscribers?format=csv" className={btn("outline", "sm")}>Export CSV</a>} />
      {!rows.length ? <Empty>No subscribers yet.</Empty> : (
        <div className={tableWrap}>
          <table className={table}>
            <thead><tr><th className={th}>Email</th><th className={th}>Subscribed</th></tr></thead>
            <tbody className={tbody}>{rows.map((r) => <tr key={r.email}><td className={td}>{r.email}</td><td className={td}>{date(r.createdAt)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
