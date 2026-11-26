import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/parts";
import { SettingsForm } from "@/components/admin/settings-form";

const TEMPLATES = [
  ["tpl_donation_receipt", "Donation receipt / thank you"],
  ["tpl_payment_failed", "Payment failed"],
  ["tpl_project_update", "New project update"],
  ["tpl_project_funded", "Project fully funded"],
  ["tpl_project_completed", "Project completed"],
  ["tpl_application_received", "Assistance application received"],
  ["tpl_monthly_sponsorship", "Monthly sponsorship payment"],
] as const;

export default async function EmailTemplates() {
  const user = await requireStaff("view");
  const s = await getSettings();
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Email templates" intro="Placeholders: {{name}}, {{amount}}, {{project}}, {{reference}}, {{receipt_url}}. Saved templates are stored as settings (tpl_*). Note: the current sending code uses its built-in wording until it is wired to read these keys." />
      <SettingsForm readOnly={!can(user.role, "settings.manage")} back="/admin/email-templates" values={s} fields={TEMPLATES.map(([key, label]) => ({ key, label, type: "textarea", rows: 5 }))} />
    </div>
  );
}
