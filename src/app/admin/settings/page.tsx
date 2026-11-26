import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/parts";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function WebsiteSettings() {
  const user = await requireStaff("view");
  const s = await getSettings();
  const ro = !can(user.role, "settings.manage");
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Website settings" intro={ro ? "Read-only — Super Administrators manage these settings." : "Organisation details used across the public site, receipts and footer."} />
      <SettingsForm readOnly={ro} back="/admin/settings" title="Organisation" values={s} fields={[
        { key: "orgName", label: "Organisation name", wide: true },
        { key: "orgShort", label: "Short name" },
        { key: "registration", label: "Registration details (footer & receipts)" },
        { key: "tagline", label: "Tagline", wide: true },
        { key: "description", label: "Organisation description", type: "textarea", rows: 3 },
      ]} />
      <SettingsForm readOnly={ro} id="contact" back="/admin/settings#contact" title="Contact details & social media" values={s} fields={[
        { key: "email", label: "Public email", type: "email" },
        { key: "phone", label: "Phone" },
        { key: "address", label: "Address", wide: true },
        { key: "social_facebook", label: "Facebook URL", type: "url" },
        { key: "social_instagram", label: "Instagram URL", type: "url" },
        { key: "social_youtube", label: "YouTube URL", type: "url" },
        { key: "social_linkedin", label: "LinkedIn URL", type: "url" },
      ]} />
      <SettingsForm readOnly={ro} back="/admin/settings" title="Bank transfer details (shown to donors choosing bank transfer)" values={s} fields={[
        { key: "bankName", label: "Bank name" },
        { key: "bankBranch", label: "Branch" },
        { key: "bankAccountName", label: "Account name" },
        { key: "bankAccountNo", label: "Account number" },
        { key: "bankSwift", label: "SWIFT / BIC" },
      ]} />
      <SettingsForm readOnly={ro} back="/admin/settings" title="Processing fee coverage (optional donor fee cover at checkout)" values={s} fields={[
        { key: "feePercent", label: "Card fee percent", type: "number", hint: "e.g. 2.9" },
        { key: "feeFixedCents", label: "Fixed fee (cents)", type: "number", hint: "e.g. 30" },
      ]} />
    </div>
  );
}
