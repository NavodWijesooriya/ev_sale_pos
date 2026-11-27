/**
 * Received documents: Delivery Orders (finance sales) and RMV documents (registration certificate, number plate).
 * Pure helpers shared by the server actions and the UI.
 *
 * Delivery Order stages:  AWAITING_DO -> DO_RECEIVED -> DELIVERED -> CLAIM_SUBMITTED -> PAID
 * PAID is never stored: it is derived from the finance receivable being fully received, so reversing a receipt
 * brings the order back to its previous stage by itself.
 */

import { hasPermission, isOwner, type PermissionSubject } from "@/lib/permissions"

export type DoStage = "AWAITING_DO" | "DO_RECEIVED" | "DELIVERED" | "CLAIM_SUBMITTED" | "PAID"

export const DO_STAGES: DoStage[] = ["AWAITING_DO", "DO_RECEIVED", "DELIVERED", "CLAIM_SUBMITTED", "PAID"]

export const DO_STAGE_LABELS: Record<DoStage, string> = {
  AWAITING_DO: "Awaiting DO",
  DO_RECEIVED: "DO received, not delivered",
  DELIVERED: "Delivered, claim not submitted",
  CLAIM_SUBMITTED: "Claim submitted, unpaid",
  PAID: "Paid",
}

export const DO_STAGE_SHORT: Record<DoStage, string> = {
  AWAITING_DO: "Awaiting DO",
  DO_RECEIVED: "DO received",
  DELIVERED: "Delivered",
  CLAIM_SUBMITTED: "Claim submitted",
  PAID: "Paid",
}

/** Documents sent to the finance company with the claim. */
export const CLAIM_CHECKLIST = [
  { key: "deliveryOrder", label: "Delivery Order" },
  { key: "invoice", label: "Invoice" },
  { key: "customerNic", label: "Customer NIC copy" },
  { key: "mtaForms", label: "MTA forms" },
  { key: "registrationDocuments", label: "Registration documents" },
] as const

export type ClaimChecklistKey = (typeof CLAIM_CHECKLIST)[number]["key"]
export type ClaimChecklist = Record<ClaimChecklistKey, boolean>

export function emptyChecklist(): ClaimChecklist {
  return { deliveryOrder: false, invoice: false, customerNic: false, mtaForms: false, registrationDocuments: false }
}

export function parseChecklist(value: unknown): ClaimChecklist {
  const base = emptyChecklist()
  if (value && typeof value === "object") {
    for (const { key } of CLAIM_CHECKLIST) base[key] = Boolean((value as Record<string, unknown>)[key])
  }
  return base
}

/** The stage shown to people: PAID wins once the finance company has paid in full. */
export function effectiveDoStage(storedStatus: string | null | undefined, financeReceived: boolean): DoStage {
  if (financeReceived) return "PAID"
  switch (storedStatus) {
    case "DO_RECEIVED":
    case "DELIVERED":
    case "CLAIM_SUBMITTED":
      return storedStatus
    default:
      return "AWAITING_DO"
  }
}

export function daysSince(date: Date | string | null | undefined, now: Date = new Date()): number {
  if (!date) return 0
  const start = new Date(date).getTime()
  if (Number.isNaN(start)) return 0
  return Math.max(0, Math.floor((now.getTime() - start) / 86_400_000))
}

export interface DoWarningInput {
  doAmount: number | null
  financeAmount: number
  expiryDate: Date | string | null
  deliveredAt: Date | string | null
  /** Hide the rupee figures in the text (for people who may not see finance amounts). */
  showAmounts: boolean
}

const money = (n: number) => `Rs. ${new Intl.NumberFormat("en-LK").format(n)}`

export function doWarnings(input: DoWarningInput, now: Date = new Date()): string[] {
  const warnings: string[] = []
  if (input.doAmount !== null && Math.abs(input.doAmount - input.financeAmount) > 0.5) {
    warnings.push(
      input.showAmounts
        ? `DO amount ${money(input.doAmount)} differs from the sale's finance amount ${money(input.financeAmount)}.`
        : "DO amount differs from the sale's finance amount.",
    )
  }
  if (input.expiryDate && !input.deliveredAt) {
    const expiry = new Date(input.expiryDate)
    if (expiry.getTime() < now.getTime() - 86_400_000 + 1) {
      warnings.push(`The DO expired on ${expiry.toISOString().slice(0, 10)} and the bike is not delivered yet.`)
    }
  }
  return warnings
}

// ---------------------------------------------------------------------------------------------
// Who may do what
// ---------------------------------------------------------------------------------------------

/** Opening the Received Documents pages (read-only unless they can also manage). */
export function canViewDocuments(user: PermissionSubject): boolean {
  return (
    isOwner(user) ||
    hasPermission(user, "MANAGE_DOCUMENTS") ||
    hasPermission(user, "CREATE_SALE") ||
    hasPermission(user, "MANAGE_CUSTOMERS") ||
    hasPermission(user, "MANAGE_FINANCE_RECEIVABLES")
  )
}

export function canManageDocuments(user: PermissionSubject): boolean {
  return hasPermission(user, "MANAGE_DOCUMENTS")
}

export function canOverrideDoDelivery(user: PermissionSubject): boolean {
  return hasPermission(user, "OVERRIDE_DO_DELIVERY")
}

/**
 * DO amounts are finance figures: shown to the owner and to staff who handle documents or finance receivables.
 * Everyone else sees the stage and dates only.
 */
export function canSeeDoAmounts(user: PermissionSubject): boolean {
  return hasPermission(user, "MANAGE_DOCUMENTS") || hasPermission(user, "MANAGE_FINANCE_RECEIVABLES")
}

// ---------------------------------------------------------------------------------------------
// RMV documents
// ---------------------------------------------------------------------------------------------

export type RmvStage = "PENDING_AT_RMV" | "RECEIVED_NOT_HANDED" | "HANDED_OVER"

export const RMV_STAGE_LABELS: Record<RmvStage, string> = {
  PENDING_AT_RMV: "Pending at RMV",
  RECEIVED_NOT_HANDED: "Received, not handed over",
  HANDED_OVER: "Handed over",
}

export interface RmvDocState {
  crReceived: boolean
  crHandedOver: boolean
  plateReceived: boolean
  plateHandedOver: boolean
}

/**
 * Something sitting in the showroom waiting to be handed over  -> RECEIVED_NOT_HANDED
 * else something still not back from RMV                          -> PENDING_AT_RMV
 * else both received and both handed over                         -> HANDED_OVER
 */
export function rmvStage(doc: RmvDocState): RmvStage {
  const waiting = (doc.crReceived && !doc.crHandedOver) || (doc.plateReceived && !doc.plateHandedOver)
  if (waiting) return "RECEIVED_NOT_HANDED"
  if (!doc.crReceived || !doc.plateReceived) return "PENDING_AT_RMV"
  return "HANDED_OVER"
}

export type HandoverTarget = "CUSTOMER" | "FINANCE_COMPANY"

// ---------------------------------------------------------------------------------------------
// One RMV status per bike (Sale Customers list)
// ---------------------------------------------------------------------------------------------

export type RmvStatusKey = "PENDING" | "SUBMITTED" | "PLATE_RECEIVED" | "CR_RECEIVED" | "HANDED_OVER"

export const RMV_STATUS_LABELS: Record<RmvStatusKey, string> = {
  PENDING: "Pending",
  SUBMITTED: "Submitted",
  PLATE_RECEIVED: "Plate received",
  CR_RECEIVED: "CR received",
  HANDED_OVER: "Handed over",
}

/** Most urgent first: documents sitting in the showroom waiting to be handed over come before everything else. */
export const RMV_STATUS_URGENCY: RmvStatusKey[] = ["CR_RECEIVED", "PLATE_RECEIVED", "PENDING", "SUBMITTED", "HANDED_OVER"]

/** Most urgent first: no DO yet, then a claim to send, then waiting for the DO to be used / for payment. */
export const DO_STAGE_URGENCY: DoStage[] = ["AWAITING_DO", "DELIVERED", "DO_RECEIVED", "CLAIM_SUBMITTED", "PAID"]

export interface RmvStatusInput {
  status: string
  isBookOk: boolean
  numberPlateStatus: string
  crHandedOverAt: Date | string | null
  plateHandedOverAt: Date | string | null
}

/**
 * Pending: documents still being collected. Submitted: sent to RMV, nothing back yet. CR received / Plate received:
 * back from RMV (CR first). Handed over: both handed over.
 */
export function rmvStatusKey(dmt: RmvStatusInput | null | undefined): RmvStatusKey {
  if (!dmt) return "PENDING"
  if (dmt.crHandedOverAt && dmt.plateHandedOverAt) return "HANDED_OVER"
  if (dmt.isBookOk) return "CR_RECEIVED"
  if (dmt.numberPlateStatus === "ISSUED") return "PLATE_RECEIVED"
  if (dmt.status === "Processing" || dmt.status === "Completed") return "SUBMITTED"
  return "PENDING"
}

/** A received document is waiting to be handed over (the same test the dashboard card counts). */
export function rmvWaitingHandover(dmt: RmvStatusInput | null | undefined): boolean {
  if (!dmt) return false
  return (dmt.isBookOk && !dmt.crHandedOverAt) || (dmt.numberPlateStatus === "ISSUED" && !dmt.plateHandedOverAt)
}
