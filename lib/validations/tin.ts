import { z } from "zod"

/** Optional customer TIN: blank, or 5-20 letters, digits or dashes. Stored trimmed; blank is stored as null. */
export const optionalTinSchema = z
  .string()
  .trim()
  .max(20, "TIN must be 5 to 20 letters, numbers or dashes.")
  .refine((value) => value === "" || /^[A-Za-z0-9-]{5,20}$/.test(value), "TIN must be 5 to 20 letters, numbers or dashes.")
  .optional()

export function normalizeTin(value: string | null | undefined): string | null {
  const tin = value?.trim().toUpperCase()
  return tin ? tin : null
}
