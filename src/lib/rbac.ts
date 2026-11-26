export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "FINANCE_MANAGER",
  "FINANCE_OFFICER",
  "PROJECT_MANAGER",
  "VERIFICATION_OFFICER",
  "CONTENT_MANAGER",
  "VOLUNTEER",
  "AUDITOR",
  "DONOR",
  "BENEFICIARY",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Administrator",
  FINANCE_MANAGER: "Finance Manager",
  FINANCE_OFFICER: "Finance Officer",
  PROJECT_MANAGER: "Project Manager",
  VERIFICATION_OFFICER: "Verification Officer",
  CONTENT_MANAGER: "Content Manager",
  VOLUNTEER: "Volunteer",
  AUDITOR: "Auditor",
  DONOR: "Donor",
  BENEFICIARY: "Beneficiary",
};

export const PERMISSIONS = [
  "view",
  "project.create",
  "project.edit",
  "project.approve",
  "project.publish",
  "payment.record",
  "payment.verify",
  "expense.create",
  "expense.approve",
  "funds.release",
  "refund",
  "export",
  "archive",
  "content.edit",
  "application.review",
  "staff.manage",
  "settings.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS] as Permission[];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== "staff.manage" && p !== "settings.manage"),
  FINANCE_MANAGER: ["view", "payment.record", "payment.verify", "expense.create", "expense.approve", "funds.release", "refund", "export"],
  FINANCE_OFFICER: ["view", "payment.record", "payment.verify", "expense.create", "export"],
  PROJECT_MANAGER: ["view", "project.create", "project.edit", "expense.create", "application.review"],
  VERIFICATION_OFFICER: ["view", "project.approve", "application.review"],
  CONTENT_MANAGER: ["view", "content.edit", "project.edit"],
  VOLUNTEER: ["view"],
  AUDITOR: ["view", "export"],
  DONOR: [],
  BENEFICIARY: [],
};

export const STAFF_ROLES: Role[] = ROLES.filter((r) => r !== "DONOR" && r !== "BENEFICIARY");

export function can(role: string | undefined, perm: Permission) {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role as Role] ?? []).includes(perm);
}

export function isStaff(role: string | undefined) {
  return !!role && (STAFF_ROLES as string[]).includes(role);
}

/**
 * Separation of duties: the person who requested a sensitive financial action
 * (refund, expense payment, adjustment) may never be the one who approves it.
 */
export function canApproveRequest(
  approver: { id: string; role: string },
  request: { requestedById: string; type: string },
) {
  if (approver.id === request.requestedById) return false;
  if (request.type === "REFUND") return can(approver.role, "refund");
  if (request.type === "EXPENSE_PAYMENT") return can(approver.role, "funds.release");
  if (request.type === "ADJUSTMENT") return can(approver.role, "funds.release");
  return false;
}
