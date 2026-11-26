/**
 * Pure helpers for STAFF pay (basic salary + commission earned on sales). No database access, so it is safe to
 * import from client components. This is the staff member's own earning, separate from the dealership's
 * finance / insurance commission (CommissionSettlement).
 */

export const RATE_TYPES = ["FIXED", "PERCENT"] as const
export type RateType = (typeof RATE_TYPES)[number]

export interface CompensationRates {
  basicSalary: number
  saleCommissionType: RateType
  saleCommissionValue: number
  financeCommissionType: RateType
  financeCommissionValue: number
}

export const NO_COMPENSATION: CompensationRates = {
  basicSalary: 0,
  saleCommissionType: "FIXED",
  saleCommissionValue: 0,
  financeCommissionType: "FIXED",
  financeCommissionValue: 0,
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

const asType = (value: string): RateType => (value === "PERCENT" ? "PERCENT" : "FIXED")

export function toRates(row: {
  basicSalary: number
  saleCommissionType: string
  saleCommissionValue: number
  financeCommissionType: string
  financeCommissionValue: number
}): CompensationRates {
  return {
    basicSalary: row.basicSalary,
    saleCommissionType: asType(row.saleCommissionType),
    saleCommissionValue: row.saleCommissionValue,
    financeCommissionType: asType(row.financeCommissionType),
    financeCommissionValue: row.financeCommissionValue,
  }
}

/** One commission part: a fixed amount, or a percentage of `base`. */
export function commissionAmount(type: RateType, value: number, base: number): number {
  if (!(value > 0)) return 0
  return round2(type === "PERCENT" ? (base * value) / 100 : value)
}

/** Validates a rate: percentages stay within 0-100, amounts are never negative. */
export function rateError(label: string, type: RateType, value: number): string | null {
  if (!Number.isFinite(value) || value < 0) return `${label} cannot be negative.`
  if (type === "PERCENT" && value > 100) return `${label} percentage cannot be more than 100.`
  if (value > 100_000_000) return `${label} is too large.`
  return null
}

/** Sale commission for every sale, finance commission added for a FINANCE sale. */
export function commissionsFor(
  rates: CompensationRates,
  sale: { paymentType: string | null; financeAmount: number; bikePrice: number },
) {
  const isFinance = sale.paymentType === "FINANCE"
  return {
    saleCommission: commissionAmount(rates.saleCommissionType, rates.saleCommissionValue, sale.bikePrice),
    financeCommission: isFinance
      ? commissionAmount(rates.financeCommissionType, rates.financeCommissionValue, sale.financeAmount)
      : 0,
  }
}

export const money = (n: number) => `Rs. ${new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2 }).format(n)}`

/** Human text of a rate, e.g. "Rs. 5,000.00 per bike" or "2% of bike price". */
export function describeRate(type: RateType, value: number, unit: "bike" | "finance"): string {
  if (!(value > 0)) return "None"
  if (type === "PERCENT") return `${value}% of ${unit === "bike" ? "bike price" : "finance amount"}`
  return `${money(value)} per ${unit === "bike" ? "bike" : "finance sale"}`
}
