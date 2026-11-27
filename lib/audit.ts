import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type Client = Prisma.TransactionClient | typeof prisma

export type AuditAction =
  | "SALE_CREATED"
  | "SALE_CANCELLED"
  | "DELIVERY_ORDER_RECORDED"
  | "DOWN_PAYMENT_RECEIVED"
  | "DO_RECEIPT_OVERRIDDEN"
  | "DELIVERY_ORDER_SCAN_CHANGED"
  | "SALE_DELIVERED"
  | "DELIVERY_OVERRIDDEN"
  | "DELIVERY_CLAIM_CHANGED"
  | "RMV_DOCUMENT_CHANGED"
  | "DEALERSHIP_DOMAIN_CHANGED"
  | "SUPPLIER_COMMISSION_SLABS_CHANGED"
  | "SUPPLIER_TARGET_CHANGED"
  | "SUPPLIER_TARGETS_COPIED"
  | "SUPPLIER_COMMISSION_MONTH_CLOSED"
  | "SUPPLIER_COMMISSION_MONTH_REOPENED"
  | "SUPPLIER_COMMISSION_RECEIVED"
  | "SUPPLIER_COMMISSION_RECEIVED_UNDONE"
  | "SALE_CHARGE_SETTINGS_CHANGED"
  | "VEHICLE_OWNERSHIP_TRANSFERRED"
  | "STAFF_PAY_CHANGED"
  | "STAFF_COMMISSION_RECALCULATED"
  | "FREE_ITEM_CREATED"
  | "FREE_ITEM_UPDATED"
  | "FREE_ITEM_ACTIVATED"
  | "FREE_ITEM_DEACTIVATED"
  | "FREE_ITEM_DELETED"
  | "GRN_CREATED"
  | "GRN_PAYABLE_UPDATED"
  | "SUPPLIER_PAYMENT_RECORDED"
  | "SUPPLIER_ADVANCE_APPLIED"
  | "CHEQUE_PRESENTED"
  | "CHEQUE_CLEARED"
  | "CHEQUE_BOUNCED"
  | "CHEQUE_CANCELLED"
  | "SUPPLIER_CREATED"
  | "SUPPLIER_UPDATED"
  | "SUPPLIER_DELETED"
  | "STAFF_PERMISSIONS_CHANGED"
  | "STAFF_CREATED"
  | "STAFF_UPDATED"
  | "STAFF_STATUS_CHANGED"
  | "COMMISSION_SETTINGS_CHANGED"
  | "ADVANCE_RECORDED"
  | "ADVANCE_REFUNDED"
  | "BRANCH_CREATED"
  | "BRANCH_UPDATED"
  | "BRANCH_DELETED"
  | "BANK_DEPOSIT_RECORDED"
  | "BANK_DEPOSIT_DELETED"
  | "BANK_ACCOUNT_SAVED"
  | "ADVANCE_TRANSFERRED"
  | "DMT_UPDATED"
  | "COMMISSION_SETTLEMENT_CHANGED"
  | "FINANCE_RECEIPT_RECORDED"
  | "FINANCE_RECEIPT_REVERSED"
  | "FINANCE_CHEQUE_PRESENTED"
  | "FINANCE_CHEQUE_CLEARED"
  | "FINANCE_CHEQUE_BOUNCED"
  | "OWNER_ACCOUNT_DISABLED"
  | "OWNER_ACCOUNT_ENABLED"
  | "OWNER_ACCOUNT_DELETED"
  | "STOCK_TRANSFER_DISPATCHED"
  | "STOCK_TRANSFER_RECEIVED"
  | "STOCK_TRANSFER_CANCELLED"

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  SALE_CREATED: "Sale created",
  SALE_CANCELLED: "Sale cancelled",
  DELIVERY_ORDER_RECORDED: "Delivery Order recorded / updated",
  DOWN_PAYMENT_RECEIVED: "Additional down payment received",
  DO_RECEIPT_OVERRIDDEN: "Finance receipt allowed without a DO (override)",
  DELIVERY_ORDER_SCAN_CHANGED: "Delivery Order scan uploaded / replaced / removed",
  SALE_DELIVERED: "Bike marked delivered",
  DELIVERY_OVERRIDDEN: "Delivery before DO (override)",
  DELIVERY_CLAIM_CHANGED: "Finance claim submitted / withdrawn",
  RMV_DOCUMENT_CHANGED: "RMV document received / handed over",
  DEALERSHIP_DOMAIN_CHANGED: "Dealership custom domain changed (platform)",
  SUPPLIER_COMMISSION_SLABS_CHANGED: "Supplier commission slabs changed",
  SUPPLIER_TARGET_CHANGED: "Supplier monthly target changed",
  SUPPLIER_TARGETS_COPIED: "Supplier targets copied from last month",
  SUPPLIER_COMMISSION_MONTH_CLOSED: "Supplier commission month closed",
  SUPPLIER_COMMISSION_MONTH_REOPENED: "Supplier commission month reopened",
  SUPPLIER_COMMISSION_RECEIVED: "Supplier commission marked received",
  SUPPLIER_COMMISSION_RECEIVED_UNDONE: "Supplier commission received undone",
  GRN_CREATED: "GRN created",
  GRN_PAYABLE_UPDATED: "GRN payable updated",
  SUPPLIER_PAYMENT_RECORDED: "Supplier payment recorded",
  SUPPLIER_ADVANCE_APPLIED: "Supplier advance applied",
  CHEQUE_PRESENTED: "Cheque presented",
  CHEQUE_CLEARED: "Cheque cleared",
  CHEQUE_BOUNCED: "Cheque bounced",
  CHEQUE_CANCELLED: "Cheque cancelled",
  SUPPLIER_CREATED: "Supplier created",
  SUPPLIER_UPDATED: "Supplier updated",
  SUPPLIER_DELETED: "Supplier deleted",
  STAFF_PERMISSIONS_CHANGED: "Staff permissions changed",
  STAFF_CREATED: "Staff account created",
  STAFF_UPDATED: "Staff account updated",
  STAFF_STATUS_CHANGED: "Staff access changed",
  COMMISSION_SETTINGS_CHANGED: "Commission settings changed",
  SALE_CHARGE_SETTINGS_CHANGED: "Sale charge settings changed",
  VEHICLE_OWNERSHIP_TRANSFERRED: "Bike ownership transferred",
  STAFF_PAY_CHANGED: "Staff salary / commission changed",
  STAFF_COMMISSION_RECALCULATED: "Staff commission recalculated",
  FREE_ITEM_CREATED: "Free item added",
  FREE_ITEM_UPDATED: "Free item updated",
  FREE_ITEM_ACTIVATED: "Free item activated",
  FREE_ITEM_DEACTIVATED: "Free item deactivated",
  FREE_ITEM_DELETED: "Free item deleted",
  ADVANCE_RECORDED: "Customer advance recorded",
  ADVANCE_REFUNDED: "Customer advance refunded",
  BRANCH_CREATED: "Branch created",
  BRANCH_UPDATED: "Branch updated",
  BRANCH_DELETED: "Branch deleted",
  BANK_DEPOSIT_RECORDED: "Bank deposit recorded",
  BANK_DEPOSIT_DELETED: "Bank deposit deleted",
  BANK_ACCOUNT_SAVED: "Bank account saved",
  ADVANCE_TRANSFERRED: "Customer advance transferred",
  DMT_UPDATED: "DMT / RMV tracking updated",
  COMMISSION_SETTLEMENT_CHANGED: "Commission settlement changed",
  FINANCE_RECEIPT_RECORDED: "Finance payment received",
  FINANCE_RECEIPT_REVERSED: "Finance payment reversed",
  FINANCE_CHEQUE_PRESENTED: "Finance cheque presented",
  FINANCE_CHEQUE_CLEARED: "Finance cheque cleared",
  FINANCE_CHEQUE_BOUNCED: "Finance cheque bounced",
  OWNER_ACCOUNT_DISABLED: "Owner account disabled (platform)",
  OWNER_ACCOUNT_ENABLED: "Owner account enabled (platform)",
  OWNER_ACCOUNT_DELETED: "Owner account deleted (platform)",
  STOCK_TRANSFER_DISPATCHED: "Stock transfer dispatched",
  STOCK_TRANSFER_RECEIVED: "Stock transfer received",
  STOCK_TRANSFER_CANCELLED: "Stock transfer cancelled",
}

export interface AuditActor {
  id: string
  name: string
  organizationId: string
  branchId?: string | null
}

export interface AuditEntry {
  action: AuditAction
  entityType: string
  entityId?: string | null
  description: string
  /** Branch the action relates to; defaults to the actor's assigned branch. */
  branchId?: string | null
}

/**
 * Writes one audit row. Pass the transaction client from inside `prisma.$transaction`
 * so the audit entry commits or rolls back together with the action it describes.
 */
export async function recordAudit(client: Client, actor: AuditActor, entry: AuditEntry) {
  await client.auditLog.create({
    data: {
      organizationId: actor.organizationId,
      userId: actor.id,
      userName: actor.name,
      branchId: entry.branchId ?? actor.branchId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      description: entry.description.slice(0, 500),
    },
  })
}
