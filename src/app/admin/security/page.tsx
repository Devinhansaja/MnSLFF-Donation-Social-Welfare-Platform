import { requireStaff } from "@/lib/auth";
import { PageHeader, Section } from "@/components/admin/parts";
import { cn } from "@/lib/format";

const ITEMS: [string, "done" | "partial" | "planned", string][] = [
  ["Password hashing", "done", "bcrypt with cost 12."],
  ["Sessions", "done", "Signed HTTP-only, SameSite=Lax cookie, 8-hour expiry; role re-checked from the database on every admin request; deactivation takes effect immediately."],
  ["Role-based authorization", "done", "Every admin page and server action checks a specific permission."],
  ["Dual approval for sensitive finance", "done", "Refunds, fund release and ledger adjustments need a second authorised person."],
  ["Audit logging", "done", "Sign-ins, failed sign-ins, approvals, verification, settings and staff changes."],
  ["Webhook verification & idempotency", "done", "HMAC-signed sandbox webhooks with replay window; unique provider references prevent double counting."],
  ["Rate limiting", "partial", "In-memory limits on sign-in and public forms. Use a shared store (e.g. Redis) when running multiple servers."],
  ["CSRF / XSS / SQL injection", "done", "Next.js server actions check origin; React escapes output; Prisma parameterises queries."],
  ["Private file storage", "done", "Bank slips and application documents served only to authorised staff through checked routes."],
  ["Two-factor authentication for administrators", "planned", "Not yet implemented. Required before launch — add TOTP (authenticator app) enrolment and enforce it for all staff roles."],
  ["Malware scanning for uploads", "planned", "Not yet implemented. Connect a scanning service (e.g. ClamAV or the storage provider's scanner) before accepting public uploads in production."],
  ["Encryption of sensitive fields at rest", "partial", "Relies on database/disk encryption of the hosting provider; no application-level field encryption yet."],
  ["HTTPS enforcement", "partial", "Handled by the hosting platform (e.g. Vercel). Ensure HSTS is enabled on the production domain."],
  ["Automated backups", "partial", "Manual backup page for SQLite; use provider backups/PITR for PostgreSQL."],
];

export default async function Security() {
  await requireStaff("view");
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Security settings" intro="An honest status of the platform's security controls." />
      <Section title="Password policy">
        <ul className="list-disc pl-5 text-sm">
          <li>Donor accounts: at least 10 characters including a letter and a number.</li>
          <li>Staff accounts: temporary password of at least 12 characters, created by a Super Administrator; share it securely and ask the person to change it.</li>
          <li>Generic error message on failed sign-in to prevent account enumeration; 10 attempts per 10 minutes per IP.</li>
        </ul>
      </Section>
      <Section title="Controls">
        <ul className="divide-y divide-line dark:divide-[#24384a]">
          {ITEMS.map(([name, status, note]) => (
            <li key={name} className="flex items-start justify-between gap-4 py-3">
              <div><p className="font-medium">{name}</p><p className="text-sm text-muted">{note}</p></div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", status === "done" ? "bg-emerald-50 text-emerald-800" : status === "partial" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700")}>
                {status === "done" ? "In place" : status === "partial" ? "Partial" : "Planned"}
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
