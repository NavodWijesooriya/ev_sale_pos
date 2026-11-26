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

export const PERMISSION_GROUPS = [
  "GRN & Inventory",
  "Sales & Billing",
  "Payments & Cheques",
  "Customers & Service",
  "Reports & Admin",
] as const

export type PermissionGroup = (typeof PERMISSION_GROUPS)[number]

export const PERMISSION_DEFINITIONS = {
  // GRN & Inventory
  CREATE_GRN: {
    group: "GRN & Inventory",
    label: "Create GRN",
    description: "Receive stock with a GRN and view GRN reports and current stock.",
  },
  TRANSFER_STOCK: {
    group: "GRN & Inventory",
    label: "Transfer stock",
    description: "Move bikes between branches.",
  },
  VIEW_INVENTORY_COST: {
    group: "GRN & Inventory",
    label: "View inventory cost",
    description: "See purchase cost and tied-up capital of bikes in stock.",
  },
  // Sales & Billing
  CREATE_SALE: {
    group: "Sales & Billing",
    label: "Create sales",
    description: "Use the POS, take customer advances and update sale paperwork.",
  },
  APPROVE_DISCOUNTS: {
    group: "Sales & Billing",
    label: "Approve discounts",
    description: "Give a discount on a sale.",
  },
  DELETE_SALES: {
    group: "Sales & Billing",
    label: "Delete sales",
    description: "Delete or void sale records.",
  },
  REFUND_ADVANCES: {
    group: "Sales & Billing",
    label: "Refund advances",
    description: "Refund a customer advance payment. The owner can always do this.",
  },
  VIEW_COST_PRICE: {
    group: "Sales & Billing",
    label: "View cost price & profit",
    description: "See bike purchase cost, margins and profit figures on sales and reports.",
  },
  // Payments & Cheques
  MANAGE_SUPPLIERS: {
    group: "Payments & Cheques",
    label: "Manage suppliers",
    description: "Add, edit and delete suppliers, set GRN payables and view supplier ledgers.",
  },
  RECORD_PAYMENTS: {
    group: "Payments & Cheques",
    label: "Record supplier payments",
    description: "Record supplier payments and apply supplier advances.",
  },
  MANAGE_CHEQUES: {
    group: "Payments & Cheques",
    label: "Manage cheques",
    description: "Issue cheques, and mark them presented, cleared, bounced or cancelled.",
  },
  MANAGE_FINANCE_RECEIVABLES: {
    group: "Payments & Cheques",
    label: "Finance receivables",
    description: "See what finance companies still owe and record the payments they make.",
  },
  MANAGE_BANK_DEPOSITS: {
    group: "Payments & Cheques",
    label: "Daily bank deposits",
    description: "Record cash paid into the bank and view the bank deposit report.",
  },
  // Customers & Service
  MANAGE_CUSTOMERS: {
    group: "Customers & Service",
    label: "Manage customers",
    description: "View, add and edit customers and CRM leads.",
  },
  MANAGE_WARRANTY_SERVICE: {
    group: "Customers & Service",
    label: "Warranty & service",
    description: "Service job cards, free-service entitlements and warranty tracking.",
  },
  // Reports & Admin
  VIEW_REPORTS: {
    group: "Reports & Admin",
    label: "View reports",
    description: "Open the Reports & Analytics section.",
  },
  MANAGE_USERS: {
    group: "Reports & Admin",
    label: "Manage users",
    description: "Create staff, block or unblock them and change roles (never owners or permissions).",
  },
  ACCESS_SETTINGS: {
    group: "Reports & Admin",
    label: "Access settings",
    description: "Open the branch settings. Commissions, permissions and audit logs stay owner-only.",
  },
} as const satisfies Record<string, { group: PermissionGroup; label: string; description: string }>

export type Permission = keyof typeof PERMISSION_DEFINITIONS

export const ALL_PERMISSIONS = Object.keys(PERMISSION_DEFINITIONS) as Permission[]

export function isPermission(value: string): value is Permission {
  return Object.prototype.hasOwnProperty.call(PERMISSION_DEFINITIONS, value)
}

/** Keeps only valid, de-duplicated permission keys. */
export function sanitizePermissions(values: readonly string[] | null | undefined): Permission[] {
  return Array.from(new Set((values ?? []).filter(isPermission)))
}

/**
 * Defaults granted when a user is created. They mirror what each role could already do
 * before permissions existed, so introducing them does not change anyone's access.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  BranchManager: [
    "CREATE_GRN",
    "TRANSFER_STOCK",
    "VIEW_INVENTORY_COST",
    "CREATE_SALE",
    "APPROVE_DISCOUNTS",
    "VIEW_COST_PRICE",
    "MANAGE_SUPPLIERS",
    "RECORD_PAYMENTS",
    "MANAGE_CHEQUES",
    "MANAGE_FINANCE_RECEIVABLES",
    "MANAGE_BANK_DEPOSITS",
    "MANAGE_CUSTOMERS",
    "MANAGE_WARRANTY_SERVICE",
    "VIEW_REPORTS",
  ],
  SalesRep: ["CREATE_SALE", "MANAGE_CUSTOMERS"],
  Cashier: ["CREATE_SALE", "MANAGE_CUSTOMERS", "MANAGE_BANK_DEPOSITS"],
  Technician: ["MANAGE_WARRANTY_SERVICE"],
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

/** True when the user holds at least one of the given permissions (owners always do). */
export function hasAnyPermission(user: PermissionSubject, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission))
}

/** True when the user must only see data from their own assigned branch. */
export function isBranchRestricted(user: PermissionSubject): boolean {
  return !isOwner(user) && Boolean(user.branchId)
}

/** Prisma `where` fragment for models with a `branchId` column. Empty for global users. */
export function branchFilter(user: PermissionSubject): { branchId?: string } {
  return isBranchRestricted(user) ? { branchId: user.branchId as string } : {}
}
