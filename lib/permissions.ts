/**
 * Fine-grained permissions.
 *
 * - OrgAdmin (dealership owner) and SuperAdmin always have every permission and
 *   global (cross-branch) access.
 * - Every other role has exactly the permissions stored on the user
 *   (User.permissions). Roles only supply the defaults given to a new user.
 * - A non-owner user with a branch assigned only sees/manages that branch.
 *
 * This file is pure (no server imports) so UI and server share one definition.
 * The UI may hide things with it, but only server-side checks are authoritative.
 */

export const PERMISSION_DEFINITIONS = {
  VIEW_COST_PRICE: {
    label: "View cost price & profit",
    description: "See bike purchase cost, margins and profit figures.",
  },
  APPROVE_DISCOUNTS: {
    label: "Approve discounts",
    description: "Give a discount on a sale.",
  },
  DELETE_SALES: {
    label: "Delete sales",
    description: "Delete or void sale records.",
  },
  VIEW_REPORTS: {
    label: "View reports",
    description: "Open the Reports & Analytics section.",
  },
  MANAGE_SUPPLIERS: {
    label: "Manage suppliers & payments",
    description: "Add suppliers, record supplier payments and manage cheques.",
  },
} as const

export type Permission = keyof typeof PERMISSION_DEFINITIONS

export const ALL_PERMISSIONS = Object.keys(PERMISSION_DEFINITIONS) as Permission[]

export function isPermission(value: string): value is Permission {
  return Object.prototype.hasOwnProperty.call(PERMISSION_DEFINITIONS, value)
}

/** Keeps only valid, de-duplicated permission keys. */
export function sanitizePermissions(values: readonly string[] | null | undefined): Permission[] {
  return Array.from(new Set((values ?? []).filter(isPermission)))
}

/** Defaults granted when a user is created (and used to back-fill existing users). */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  BranchManager: ["VIEW_REPORTS", "MANAGE_SUPPLIERS", "VIEW_COST_PRICE", "APPROVE_DISCOUNTS"],
  SalesRep: [],
  Cashier: [],
  Technician: [],
}

export function defaultPermissionsForRole(role: string): Permission[] {
  return [...(ROLE_DEFAULT_PERMISSIONS[role] ?? [])]
}

export interface PermissionSubject {
  role: string
  permissions?: readonly string[] | null
  branchId?: string | null
}

/** Dealership owner / platform admin: all permissions, all branches. */
export function isOwner(user: Pick<PermissionSubject, "role">): boolean {
  return user.role === "OrgAdmin" || user.role === "SuperAdmin"
}

export function hasPermission(user: PermissionSubject, permission: Permission): boolean {
  if (isOwner(user)) return true
  return (user.permissions ?? []).includes(permission)
}

/** True when the user must only see data from their own assigned branch. */
export function isBranchRestricted(user: PermissionSubject): boolean {
  return !isOwner(user) && Boolean(user.branchId)
}

/** Prisma `where` fragment for models with a `branchId` column. Empty for global users. */
export function branchFilter(user: PermissionSubject): { branchId?: string } {
  return isBranchRestricted(user) ? { branchId: user.branchId as string } : {}
}
