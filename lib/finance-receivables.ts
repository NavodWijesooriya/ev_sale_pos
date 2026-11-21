/**
 * Finance (leasing) receivable rules. Pure, shared by the server actions, the UI and the tests.
 *
 * A finance sale leaves the finance company owing the dealership the loan amount
 * (FinanceDetail.totalFinanceAmount). Commission is a separate matter (CommissionSettlement).
 */

export const EPSILON = 0.005

/**
 * Is this a finance (leasing) sale? Finance sales are saved with paymentType "FINANCE" and a payment
 * method of "Leasing" (never "Finance"), and every sale has status "Completed". Detect them by type,
 * not by method or status. "Leasing" is also accepted for older rows saved before paymentType existed.
 */
export function isFinanceSale(sale: { paymentType?: string | null; paymentMethod?: string | null }): boolean {
  return sale.paymentType === "FINANCE" || sale.paymentMethod === "Leasing" || sale.paymentMethod === "Finance"
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export type FinanceStatusKey = "Pending" | "Partial" | "Received"

/** Pending (nothing received) -> Partial (some received) -> Received (nothing left). */
export function deriveFinanceStatus(total: number, received: number): FinanceStatusKey {
  if (total - received <= EPSILON) return "Received"
  if (received > EPSILON) return "Partial"
  return "Pending"
}

/** Tracking fields for a new finance sale. A finance amount of zero means nothing is owed. */
export function initialFinanceTracking(financeAmount: number) {
  const total = Math.max(0, round2(financeAmount))
  const status = deriveFinanceStatus(total, 0)
  return {
    receivedAmount: 0,
    balanceAmount: total,
    status,
    receivedAt: status === "Received" ? new Date() : null,
  }
}

export const AGING_BUCKETS = ["0-29", "30-59", "60-89", "90+"] as const
export type AgingBucket = (typeof AGING_BUCKETS)[number]

export const AGING_LABELS: Record<AgingBucket, string> = {
  "0-29": "Under 30 days",
  "30-59": "30 to 60 days",
  "60-89": "60 to 90 days",
  "90+": "Over 90 days",
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days since the sale date (never negative). */
export function ageInDays(saleDate: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - saleDate.getTime()) / DAY_MS))
}

export function agingBucket(days: number): AgingBucket {
  if (days < 30) return "0-29"
  if (days < 60) return "30-59"
  if (days < 90) return "60-89"
  return "90+"
}

/**
 * Incoming cheque lifecycle (mirrors the supplier cheque lifecycle):
 *   RECEIVED -> PRESENTED -> CLEARED
 *   RECEIVED / PRESENTED -> BOUNCED
 *   CLEARED -> BOUNCED   (a cheque returned after it had been applied: the receipt is reversed once)
 */
export type IncomingChequeStatusKey = "RECEIVED" | "PRESENTED" | "CLEARED" | "BOUNCED"

export const INCOMING_CHEQUE_ALLOWED_FROM: Record<"PRESENTED" | "CLEARED" | "BOUNCED", IncomingChequeStatusKey[]> = {
  PRESENTED: ["RECEIVED"],
  CLEARED: ["RECEIVED", "PRESENTED"],
  BOUNCED: ["RECEIVED", "PRESENTED", "CLEARED"],
}
