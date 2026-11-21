import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type Client = Prisma.TransactionClient | typeof prisma

export type AuditAction =
  | "SALE_CREATED"
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

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  SALE_CREATED: "Sale created",
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
