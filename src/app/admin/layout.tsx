import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS, type Role } from "@/lib/rbac";
import { AdminShell, type NavGroup } from "@/components/admin/shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const GROUPS: NavGroup[] = [
  { title: "Overview", icon: "overview", items: [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/analytics", label: "Analytics" },
    { href: "/admin/activity", label: "Activity Feed" },
  ] },
  { title: "Projects", icon: "projects", items: [
    { href: "/admin/projects", label: "All Projects" },
    { href: "/admin/projects/new", label: "Add New Project" },
    { href: "/admin/categories", label: "Project Categories" },
    { href: "/admin/projects?priority=URGENT", label: "Urgent Projects" },
    { href: "/admin/projects?verification=PENDING", label: "Project Verification" },
    { href: "/admin/projects?status=FULLY_FUNDED", label: "Fully Funded Projects" },
    { href: "/admin/projects?status=COMPLETED", label: "Completed Projects" },
    { href: "/admin/requirements", label: "Project Requirements" },
    { href: "/admin/timeline", label: "Project Timeline" },
    { href: "/admin/updates", label: "Project Updates" },
  ] },
  { title: "Beneficiaries", icon: "beneficiaries", items: [
    { href: "/admin/beneficiaries", label: "All Beneficiaries" },
    { href: "/admin/beneficiaries?type=family", label: "Families" },
    { href: "/admin/beneficiaries?type=school", label: "Schools" },
    { href: "/admin/beneficiaries?type=individual", label: "Individuals" },
    { href: "/admin/applications", label: "Assistance Applications" },
    { href: "/admin/staff?role=VERIFICATION_OFFICER", label: "Verification Officers" },
  ] },
  { title: "Donations", icon: "donations", items: [
    { href: "/admin/donations", label: "All Donations" },
    { href: "/admin/donations/new", label: "Add Manual Donation" },
    { href: "/admin/donations?status=PAID", label: "Confirmed Donations" },
    { href: "/admin/donations?status=PENDING", label: "Pending Donations" },
    { href: "/admin/donations?status=FAILED", label: "Failed Donations" },
    { href: "/admin/donations?status=REFUNDED", label: "Refunded Donations" },
    { href: "/admin/donations?frequency=MONTHLY", label: "Recurring Donations" },
    { href: "/admin/donations?kind=ITEM", label: "Item Sponsorships" },
    { href: "/admin/approvals", label: "Approvals Queue" },
  ] },
  { title: "Donors", icon: "donors", items: [
    { href: "/admin/donors?type=INDIVIDUAL", label: "Individual Donors" },
    { href: "/admin/donors?type=CORPORATE", label: "Corporate Donors" },
    { href: "/admin/donors?intl=1", label: "International Donors" },
    { href: "/admin/donations?anonymous=1", label: "Anonymous Donations" },
    { href: "/admin/donors?public=1", label: "Donor Directory" },
  ] },
  { title: "Finance", icon: "finance", items: [
    { href: "/admin/finance", label: "Financial Dashboard" },
    { href: "/admin/finance/budgets", label: "Project Budgets" },
    { href: "/admin/finance/allocation", label: "Fund Allocation" },
    { href: "/admin/finance/expenses", label: "Project Expenses" },
    { href: "/admin/finance/expenses?admin=1", label: "Administrative Expenses" },
    { href: "/admin/finance/transactions", label: "Payment Transactions" },
    { href: "/admin/finance/reconciliation", label: "Bank Reconciliation" },
    { href: "/admin/finance/fees", label: "Gateway Fees" },
    { href: "/admin/finance/refunds", label: "Refund Management" },
    { href: "/admin/finance/exchange", label: "Currency Exchange Records" },
    { href: "/admin/finance/adjustments", label: "Financial Adjustments" },
    { href: "/admin/finance/ledger", label: "Financial Ledger" },
    { href: "/admin/reports", label: "Financial Reports" },
  ] },
  { title: "Website CMS", icon: "cms", items: [
    { href: "/admin/cms", label: "Homepage" },
    { href: "/admin/cms/hero", label: "Hero Banners" },
    { href: "/admin/cms/featured", label: "Featured Projects" },
    { href: "/admin/cms/pages?page=about", label: "About Us" },
    { href: "/admin/cms/testimonials?role=BENEFICIARY", label: "Success Stories" },
    { href: "/admin/cms/testimonials", label: "Testimonials" },
    { href: "/admin/cms/gallery", label: "Gallery" },
    { href: "/admin/cms/pages?page=blog", label: "Blog" },
    { href: "/admin/cms/pages?page=faq", label: "FAQ" },
    { href: "/admin/settings#contact", label: "Contact Details" },
    { href: "/admin/cms/pages?page=privacy", label: "Legal Pages" },
    { href: "/admin/cms/seo", label: "SEO Settings" },
    { href: "/admin/cms/messages", label: "Contact Messages" },
    { href: "/admin/cms/subscribers", label: "Subscribers" },
  ] },
  { title: "Administration", icon: "admin", items: [
    { href: "/admin/staff", label: "Staff Management" },
    { href: "/admin/roles", label: "Roles and Permissions" },
    { href: "/admin/notifications", label: "Notifications" },
    { href: "/admin/email-templates", label: "Email Templates" },
    { href: "/admin/gateways", label: "Payment Gateway Settings" },
    { href: "/admin/finance/exchange?tab=settings", label: "Currency Settings" },
    { href: "/admin/settings", label: "Website Settings" },
    { href: "/admin/audit", label: "Audit Logs" },
    { href: "/admin/backup", label: "Backup Management" },
    { href: "/admin/security", label: "Security Settings" },
  ] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff("view");
  const [unread, demo] = await Promise.all([
    db.notification.count({ where: { read: false, OR: [{ userId: null }, { userId: user.id }] } }),
    db.project.count({ where: { isDemo: true } }).then(async (n) => n > 0 || (await db.donation.count({ where: { isDemo: true } })) > 0),
  ]);
  return (
    <AdminShell groups={GROUPS} user={{ name: user.name, role: ROLE_LABELS[user.role as Role] ?? user.role }} unread={unread} demo={demo}>
      {children}
    </AdminShell>
  );
}
