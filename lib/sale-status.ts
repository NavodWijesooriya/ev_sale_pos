/**
 * Sale status helpers. A cancelled sale is never deleted: it keeps status "CANCELLED" and stays visible in
 * Sales History, but it must not count in any revenue, commission, payroll, stock or receivable figure.
 *
 * Every query that sums or lists sales for a report puts `activeSale` (or `activeSaleRelation` when the sale is
 * reached through another model) in its `where`.
 */

export const CANCELLED_SALE_STATUS = "CANCELLED"

/** `where` fragment for a Sale query that must ignore cancelled sales. */
export const activeSale = { status: { not: CANCELLED_SALE_STATUS } } as const

/** The same, for a model that reaches the sale through a relation named `sale`. */
export const activeSaleRelation = { sale: activeSale } as const

export function isCancelledSale(sale: { status?: string | null }): boolean {
  return sale.status === CANCELLED_SALE_STATUS
}

export const CANCEL_TYPES = ["MISTAKE", "RETURNED"] as const
export type CancelType = (typeof CANCEL_TYPES)[number]

export const CANCEL_TYPE_LABELS: Record<CancelType, string> = {
  MISTAKE: "Entered by mistake",
  RETURNED: "Customer returned the bike",
}

export const CANCEL_REFUND_METHODS = ["Cash", "BankTransfer", "CHEQUE"] as const
export type CancelRefundMethod = (typeof CANCEL_REFUND_METHODS)[number]

export const CANCEL_REFUND_METHOD_LABELS: Record<CancelRefundMethod, string> = {
  Cash: "Cash",
  BankTransfer: "Bank transfer",
  CHEQUE: "Cheque",
}

export function cancelTypeLabel(type: string | null | undefined): string {
  return type && type in CANCEL_TYPE_LABELS ? CANCEL_TYPE_LABELS[type as CancelType] : "Cancelled"
}

export function refundMethodLabel(method: string | null | undefined): string {
  return method && method in CANCEL_REFUND_METHOD_LABELS ? CANCEL_REFUND_METHOD_LABELS[method as CancelRefundMethod] : (method ?? "")
}
