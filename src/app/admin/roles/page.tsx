import { requireStaff } from "@/lib/auth";
import { PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS, ROLES } from "@/lib/rbac";
import { PageHeader, Section } from "@/components/admin/parts";
import { tableWrap, td, th } from "@/components/admin/styles";

export default async function Roles() {
  await requireStaff("view");
  return (
    <div className="space-y-6">
      <PageHeader title="Roles and permissions" intro="Defined in code (src/lib/rbac.ts) so they are reviewed and version-controlled. Change them there, not at runtime." />
      <div className={tableWrap}>
        <table className="min-w-full text-sm">
          <thead><tr><th className={`${th} sticky left-0 bg-white dark:bg-[#132430]`}>Role</th>{PERMISSIONS.map((p) => <th key={p} className={`${th} text-center`}>{p}</th>)}</tr></thead>
          <tbody>
            {ROLES.map((r) => (
              <tr key={r} className="border-t border-line dark:border-[#24384a]">
                <td className={`${td} sticky left-0 bg-white font-semibold dark:bg-[#132430]`}>{ROLE_LABELS[r]}</td>
                {PERMISSIONS.map((p) => <td key={p} className="px-3 py-2 text-center">{ROLE_PERMISSIONS[r].includes(p) ? <span className="text-success" aria-label="allowed">●</span> : <span className="text-line" aria-label="not allowed">·</span>}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Section title="Separation of duties (enforced in code)">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Whoever creates a project cannot approve its verification.</li>
          <li>Whoever records a manual donation cannot verify it.</li>
          <li>Whoever creates an expense cannot approve it.</li>
          <li>Refunds, expense payments (fund release) and ledger adjustments need a second authorised person in the Approvals queue — no one can approve their own request.</li>
          <li>Confirmed donation totals can never be edited directly; corrections are documented ledger adjustments.</li>
        </ul>
      </Section>
    </div>
  );
}
