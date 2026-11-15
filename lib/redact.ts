import { hasPermission, isOwner, type PermissionSubject } from "@/lib/permissions"

/** Cost/profit fields only users with VIEW_COST_PRICE may see. */
export const COST_FIELDS = ["purchasePrice"] as const

/** Commission fields only the owner may see. */
export const COMMISSION_FIELDS = [
  "commissionAmount",
  "commissionRate",
  "commissionBasis",
  "financeCommission",
  "insuranceCommission",
  "dealerCommission",
  "commissionRecipientId",
] as const

type Primitive = string | number | boolean | null | undefined | Date

/**
 * Returns a copy of `value` with the given keys zeroed (numbers) or nulled, at any
 * depth. Server-side redaction: hidden UI alone would still leak the data in the payload.
 */
export function redactKeys<T>(value: T, keys: readonly string[]): T {
  if (Array.isArray(value)) return value.map((item) => redactKeys(item, keys)) as unknown as T
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (keys.includes(key)) {
        out[key] = typeof v === "number" ? 0 : null
      } else {
        out[key] = redactKeys(v as Primitive, keys)
      }
    }
    return out as T
  }
  return value
}

/** Applies cost and commission redaction according to the viewer's permissions. */
export function redactForUser<T>(value: T, user: PermissionSubject): T {
  let result = value
  if (!hasPermission(user, "VIEW_COST_PRICE")) result = redactKeys(result, COST_FIELDS)
  if (!isOwner(user)) result = redactKeys(result, COMMISSION_FIELDS)
  return result
}
