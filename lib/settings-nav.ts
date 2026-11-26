import {
  Bike,
  Building2,
  Gift,
  Percent,
  Palette,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { hasPermission, isOwner, type PermissionSubject } from "@/lib/permissions"

/**
 * The Settings area: one list drives the settings menu, the main sidebar's Settings item,
 * the /dashboard/settings redirect and the page headers.
 *
 * `canAccess` repeats EXACTLY the check each page and its server actions already enforce. This file only
 * decides what is shown; the pages themselves stay authoritative.
 */
export type SettingsKey =
  | "users"
  | "permissions"
  | "payroll"
  | "sale-charges"
  | "commissions"
  | "free-items"
  | "branches"
  | "vehicle-models"
  | "appearance"
  | "audit-logs"

export interface SettingsItem {
  key: SettingsKey
  title: string
  href: string
  icon: LucideIcon
  /** One-line description shown under the page title. */
  description: string
  canAccess: (user: PermissionSubject) => boolean
}

export interface SettingsSection {
  title: string
  items: SettingsItem[]
}

const ownerOnly = (user: PermissionSubject) => isOwner(user)

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: "Team & Access",
    items: [
      {
        key: "users",
        title: "Users",
        href: "/dashboard/settings/users",
        icon: Users,
        description: "Add staff, change roles and block or unblock their login.",
        canAccess: (user) => hasPermission(user, "MANAGE_USERS"),
      },
      {
        key: "permissions",
        title: "Permissions",
        href: "/dashboard/settings/permissions",
        icon: ShieldCheck,
        description: "Choose what each staff member is allowed to do.",
        canAccess: ownerOnly,
      },
      {
        key: "payroll",
        title: "Staff Payroll",
        href: "/dashboard/settings/payroll",
        icon: Wallet,
        description: "Monthly salary plus staff commission for every staff member.",
        canAccess: ownerOnly,
      },
    ],
  },
  {
    title: "Sales Setup",
    items: [
      {
        key: "sale-charges",
        title: "Sale Charges",
        href: "/dashboard/settings/sale-charges",
        icon: ReceiptText,
        description: "The RMV charge and third-party insurance added to new sales.",
        canAccess: ownerOnly,
      },
      {
        key: "commissions",
        title: "Commissions",
        href: "/dashboard/settings/commissions",
        icon: Percent,
        description: "Finance and insurance commission rules.",
        canAccess: ownerOnly,
      },
      {
        key: "free-items",
        title: "Free Items",
        href: "/dashboard/settings/free-items",
        icon: Gift,
        description: "The free items staff can include with a sale.",
        canAccess: ownerOnly,
      },
    ],
  },
  {
    title: "Business",
    items: [
      {
        key: "branches",
        title: "Branches",
        href: "/dashboard/settings/branches",
        icon: Building2,
        description: "Showrooms, branches and service centres of the dealership.",
        canAccess: (user) => hasPermission(user, "ACCESS_SETTINGS"),
      },
      {
        key: "vehicle-models",
        title: "Vehicle Models",
        href: "/dashboard/settings/vehicle-models",
        icon: Bike,
        description: "The EV models you sell and their default catalog prices.",
        canAccess: (user) => user.role === "OrgAdmin" || user.role === "BranchManager",
      },
      {
        key: "appearance",
        title: "Storefront Branding",
        href: "/dashboard/settings/appearance",
        icon: Palette,
        description: "Logo, hero banner and colours of your public showroom.",
        canAccess: (user) => user.role === "OrgAdmin" || user.role === "SuperAdmin",
      },
    ],
  },
  {
    title: "Security",
    items: [
      {
        key: "audit-logs",
        title: "Audit Logs",
        href: "/dashboard/settings/audit-logs",
        icon: ScrollText,
        description: "Who did what and when. Only the dealership owner can see this.",
        canAccess: ownerOnly,
      },
    ],
  },
]

export const ALL_SETTINGS_ITEMS: SettingsItem[] = SETTINGS_SECTIONS.flatMap((section) => section.items)

/** Sections the user may see; items they cannot open are dropped, and a section with none left is dropped. */
export function visibleSettingsSections(user: PermissionSubject): SettingsSection[] {
  return SETTINGS_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.canAccess(user)),
  })).filter((section) => section.items.length > 0)
}

/** The first settings page the user may open, or null when they can open none. */
export function firstSettingsHref(user: PermissionSubject): string | null {
  return visibleSettingsSections(user)[0]?.items[0]?.href ?? null
}

