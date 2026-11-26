import fs from "node:fs/promises";
import path from "node:path";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader, Section, Empty } from "@/components/admin/parts";
import { SubmitButton } from "@/components/forms";
import { createBackup } from "@/app/actions/admin/system";

async function listBackups() {
  try {
    const dir = path.resolve(process.cwd(), "storage", "backups");
    const files = await fs.readdir(dir);
    const stats = await Promise.all(files.filter((f) => f.endsWith(".db")).map(async (f) => ({ f, s: await fs.stat(path.join(dir, f)) })));
    return stats.sort((a, b) => b.s.mtimeMs - a.s.mtimeMs);
  } catch {
    return [];
  }
}

export default async function Backup() {
  const user = await requireStaff("view");
  const sqlite = (process.env.DATABASE_URL ?? "").startsWith("file:");
  const backups = await listBackups();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Backup management" intro="Financial records must never be lost. Keep at least one recent backup off the server." />
      <Section title={sqlite ? "SQLite (development)" : "PostgreSQL (production)"}>
        {sqlite ? (
          <>
            <p className="mb-3 text-sm text-muted">Creates a consistent copy of the database file in <code>storage/backups/</code> on this server. Copy backups somewhere safe — a backup on the same disk does not protect against disk failure.</p>
            {can(user.role, "settings.manage") && <form action={createBackup}><SubmitButton confirm="Create a database backup now?">Create backup now</SubmitButton></form>}
          </>
        ) : (
          <div className="space-y-2 text-sm">
            <p>Use your database provider&apos;s automated daily backups and point-in-time recovery (e.g. Supabase PITR), plus a periodic logical dump:</p>
            <pre className="overflow-x-auto rounded-lg bg-navy p-3 text-xs text-white">pg_dump &quot;$DATABASE_URL&quot; --format=custom --file=mnslff-$(date +%F).dump</pre>
            <p>Store dumps encrypted in a separate account or region and test restores quarterly with <code>pg_restore</code>.</p>
          </div>
        )}
      </Section>
      {sqlite && (
        <Section title="Existing backups">
          {!backups.length ? <Empty>No backups yet.</Empty> : (
            <ul className="divide-y divide-line text-sm dark:divide-[#24384a]">
              {backups.map(({ f, s }) => <li key={f} className="flex justify-between py-2"><span className="font-mono text-xs">{f}</span><span className="text-muted">{(s.size / 1024).toFixed(0)} KB · {s.mtime.toISOString().slice(0, 16).replace("T", " ")}</span></li>)}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}
