/**
 * The Delivery Order amount decides the finance split. The bike price never changes.
 *
 * Example: bike price 500,000, down payment 100,000, finance amount 400,000.
 *
 *  - DO 350,000 (LOWER than the finance amount)
 *      new finance amount = 350,000                      (the receivable: what the finance company owes)
 *      additional down payment = 400,000 - 350,000 = 50,000 (what the customer owes)
 *      required down payment   = 100,000 + 50,000 = 150,000
 *  - DO 400,000 (EQUAL): nothing changes.
 *  - DO 420,000 (HIGHER): only a warning. The owner must confirm; it is saved as a note and the sale split is NOT changed
 *    (finance amount stays 400,000, nothing extra is owed by the customer).
 *
 * Pure: shared by the server action and the dialog preview.
 */

export const SPLIT_EPSILON = 0.5

export type DoSplitKind = "LOWER" | "EQUAL" | "HIGHER"

export interface DoSplitPlan {
  kind: DoSplitKind
  /** The finance amount of the sale afterwards (and the receivable the finance company owes). */
  financeAmount: number
  /** What the customer owes as additional down payment in total (paid or not). */
  additionalDownPaymentDue: number
  /** The finance amount the sale was originally made with. */
  originalFinanceAmount: number
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** `originalFinanceAmount` is the finance amount the sale was made with (before any DO adjustment). */
export function planDoSplit(originalFinanceAmount: number, doAmount: number): DoSplitPlan {
  const original = round2(originalFinanceAmount)
  const diff = round2(original - doAmount)
  if (diff > SPLIT_EPSILON) {
    return { kind: "LOWER", financeAmount: round2(doAmount), additionalDownPaymentDue: diff, originalFinanceAmount: original }
  }
  if (diff < -SPLIT_EPSILON) {
    return { kind: "HIGHER", financeAmount: original, additionalDownPaymentDue: 0, originalFinanceAmount: original }
  }
  return { kind: "EQUAL", financeAmount: original, additionalDownPaymentDue: 0, originalFinanceAmount: original }
}

export function requiredDownPayment(downPayment: number, additionalDue: number): number {
  return round2(downPayment + additionalDue)
}

/** What the customer still owes of the additional down payment. */
export function downPaymentBalance(due: number, paid: number): number {
  return Math.max(0, round2(due - paid))
}
