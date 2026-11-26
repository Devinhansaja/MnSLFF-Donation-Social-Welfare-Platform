import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, ROLE_LABELS, STAFF_ROLES, type Role } from "@/lib/rbac";
import { date } from "@/lib/format";
import { type SP } from "@/lib/admin-utils";
import { PageHeader, Section, Filters, Select } from "@/components/admin/parts";
import { SubmitButton } from "@/components/forms";
import { createStaff, updateStaff } from "@/app/actions/admin/system";
import { table, tableWrap, tbody, td, th } from "@/components/admin/styles";

export default async function Staff({ searchParams }: { searchParams: SP }) {
  const user = await requireStaff("view");
  const sp = await searchParams;
  const manage = can(user.role, "staff.manage");
  const rows = await db.user.findMany({
    where: { role: sp.role ? sp.role : { in: STAFF_ROLES as string[] } },
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
  });
  return (
    <div className="space-y-6">
      <PageHeader title={sp.role === "VERIFICATION_OFFICER" ? "Verification officers" : "Staff management"} intro="Each person gets their own account and the least-privileged role they need. Deactivated accounts are blocked immediately." />
      {manage && (
        <Section title="Add staff member">
          <form action={createStaff} className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <input name="name" required placeholder="Full name" className="field" aria-label="Full name" />
            <input name="email" type="email" required placeholder="Email" className="field" aria-label="Email" />
            <select name="role" className="field" aria-label="Role" defaultValue={sp.role ?? "PROJECT_MANAGER"}>{STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
            <input name="password" type="password" required minLength={12} placeholder="Temporary password (12+)" className="field" aria-label="Temporary password" autoComplete="new-password" />
            <SubmitButton>Create account</SubmitButton>
          </form>
        </Section>
      )}
      <Filters action="/admin/staff"><Select name="role" label="Role" value={sp.role} options={STAFF_ROLES.map((r) => [r, ROLE_LABELS[r]])} /></Filters>
      <div className={tableWrap}>
        <table className={table}>
          <thead><tr><th className={th}>Name</th><th className={th}>Email</th><th className={th}>Created</th><th className={th}>Role & status</th></tr></thead>
          <tbody className={tbody}>
            {rows.map((u) => (
              <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                <td className={td}>{u.name}{u.id === user.id && <span className="ml-1 text-xs text-muted">(you)</span>}</td>
                <td className={td}>{u.email}</td>
                <td className={td}>{date(u.createdAt)}</td>
                <td className={td}>
                  {manage && u.id !== user.id ? (
                    <form action={updateStaff} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role} className="field h-9 w-52 !py-1 text-sm" aria-label="Role">{STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
                      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={u.active} className="size-4 accent-forest" /> Active</label>
                      <SubmitButton size="sm" variant="outline" confirm={`Update ${u.name}'s access?`}>Save</SubmitButton>
                    </form>
                  ) : `${ROLE_LABELS[u.role as Role] ?? u.role}${u.active ? "" : " · inactive"}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
