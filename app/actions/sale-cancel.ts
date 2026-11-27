"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { DMTStatus, FinanceStatus, SettlementStatus, VehicleStatus, AdvancePaymentStatus, type Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { recordAudit } from "@/lib/audit"
import { requirePermission } from "@/lib/authorize"
import { branchFilter } from "@/lib/permissions"
import { voidStaffCommissionForSale } from "@/lib/staff-compensation"
import {
  CANCEL_REFUND_METHODS,
  CANCEL_TYPES,
  CANCEL_TYPE_LABELS,
  CANCELLED_SALE_STATUS,
  isCancelledSale,
  refundMethodLabel,
  type CancelType,
} from "@/lib/sale-status"

/**
 * Cancelling a sale (entered by mistake / customer returned the bike). Only the owner, or staff the owner gave the
 * "Cancel sales" permission, can do it; this is enforced here, not in the screen.
 */

type Client = Prisma.TransactionClient | typeof prisma

const round2 = (n: number) => Math.round(n * 100) / 100
const money = (n: number) => `Rs. ${n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export interface CancelBlocker {
  code: "ALREADY_CANCELLED" | "FINANCE_RECEIPTS" | "OWNERSHIP_TRANSFERRED" | "DMT_COMPLETED"
  message: string
}

export interface CancelPreview {
  saleId: string
  invoiceNumber: string
  blockers: CancelBlocker[]
  /** What the cancellation will undo, shown to the person before they confirm. */
  effects: string[]
  /** Most that can be refunded to the customer. */
  maxRefund: number
  advanceAmount: number
}

async function findBlockers(client: Client, sale: {
  id: string
  organizationId: string
  vehicleId: string
  saleDate: Date
  status: string
  dmtStatus: DMTStatus | null
  plateIssued: boolean
}): Promise<CancelBlocker[]> {
  const blockers: CancelBlocker[] = []
  if (isCancelledSale(sale)) {
    return [{ code: "ALREADY_CANCELLED", message: "This sale is already cancelled." }]
  }

  // 1. Money received from the finance company and allocated to this sale (reserved cheques count too).
  const allocations = await client.financeReceiptAllocation.findMany({
    where: {
      financeDetail: { saleId: sale.id },
      receipt: { status: { in: ["COMPLETED", "PENDING"] } },
    },
    select: { amount: true, receipt: { select: { receiptNumber: true, status: true } } },
  })
  if (allocations.length > 0) {
    const list = allocations
      .map((a) => `${a.receipt.receiptNumber} (${money(a.amount)}${a.receipt.status === "PENDING" ? ", cheque not cleared" : ""})`)
      .join(", ")
    blockers.push({
      code: "FINANCE_RECEIPTS",
      message: `Finance receipts are allocated to this sale: ${list}. Reverse them in Finance receivables first.`,
    })
  }

  // 2. The bike was transferred to another owner after this sale.
  const transfers = await client.vehicleOwnershipTransfer.findMany({
    where: { vehicleId: sale.vehicleId, organizationId: sale.organizationId, createdAt: { gte: sale.saleDate } },
    select: { slipNumber: true },
  })
  if (transfers.length > 0) {
    blockers.push({
      code: "OWNERSHIP_TRANSFERRED",
      message: `The bike's ownership has been transferred (${transfers.map((t) => t.slipNumber).join(", ")}). A transferred bike cannot be returned through a sale cancellation.`,
    })
  }

  // 3. The DMT / RMV registration is finished and the number plate is issued.
  if (sale.dmtStatus === DMTStatus.Completed) {
    blockers.push({
      code: "DMT_COMPLETED",
      message: "The DMT / RMV registration is Completed (the number plate is issued).",
    })
  }
  return blockers
}

async function loadSaleForCancel(client: Client, organizationId: string, saleId: string, scope: { branchId?: string }) {
  return client.sale.findFirst({
    where: { id: saleId, organizationId, ...scope },
    select: {
      id: true,
      organizationId: true,
      branchId: true,
      invoiceNumber: true,
      vehicleId: true,
      saleDate: true,
      status: true,
      totalAmount: true,
      paymentType: true,
      financeAmount: true,
      advancePaymentId: true,
      advanceDeducted: true,
      dmtRegistration: { select: { status: true, numberPlateStatus: true } },
      financeDetail: { select: { id: true } },
      vehicle: { select: { chassisNumber: true, status: true, vehicleModel: { select: { brand: true, modelName: true } } } },
      commissionSettlements: { select: { type: true, status: true } },
      staffCommission: { select: { status: true } },
    },
  })
}

function blockerInput(sale: NonNullable<Awaited<ReturnType<typeof loadSaleForCancel>>>) {
  return {
    id: sale.id,
    organizationId: sale.organizationId,
    vehicleId: sale.vehicleId,
    saleDate: sale.saleDate,
    status: sale.status,
    dmtStatus: sale.dmtRegistration?.status ?? null,
    plateIssued: sale.dmtRegistration?.numberPlateStatus === "ISSUED",
  }
}

/** The most the customer can be handed back: what they paid themselves (the finance company's share is not theirs). */
function maxRefundFor(sale: { totalAmount: number; paymentType: string | null; financeAmount: number }) {
  return round2(Math.max(0, sale.totalAmount - (sale.paymentType === "FINANCE" ? sale.financeAmount : 0)))
}

/** What the confirmation dialog shows: the blockers (exactly what stops it) and what will be undone. */
export async function getSaleCancelPreview(saleId: string): Promise<{ success: true; data: CancelPreview } | { success: false; error: string }> {
  try {
    const user = await requirePermission("CANCEL_SALE")
    const sale = await loadSaleForCancel(prisma, user.organizationId, saleId, branchFilter(user))
    if (!sale) return { success: false, error: "Sale not found in your dealership records." }

    const blockers = await findBlockers(prisma, blockerInput(sale))
    const effects = [
      `The bike (${sale.vehicle.chassisNumber}) goes back to AVAILABLE stock in its branch. Its original GRN date is kept, so stock aging is unchanged.`,
      "The seller's staff commission for this sale is voided.",
      "The finance / insurance / RMV commission settlements for this sale are voided.",
    ]
    if (sale.financeDetail) effects.push("The finance receivable is cancelled and leaves Pending receivables and the dashboard.")
    if (sale.dmtRegistration) effects.push("The DMT / RMV record is cancelled and leaves Pending DMT.")
    if (sale.advancePaymentId) effects.push(`The customer advance used on this sale (${money(sale.advanceDeducted)}) goes back to Pending, so it can be used again or refunded.`)
    effects.push("The sale stays in Sales History marked CANCELLED, and is left out of revenue, commission, payroll and sales reports.")

    return {
      success: true,
      data: {
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        blockers,
        effects,
        maxRefund: maxRefundFor(sale),
        advanceAmount: sale.advancePaymentId ? sale.advanceDeducted : 0,
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not check this sale." }
  }
}

const cancelSaleSchema = z
  .object({
    saleId: z.string().min(1, "Sale is required."),
    type: z.enum(CANCEL_TYPES, { message: "Choose why the sale is being cancelled." }),
    reason: z.string().trim().min(3, "Enter the reason for cancelling this sale.").max(500, "Keep the reason under 500 characters."),
    refundAmount: z.number().min(0, "The refund cannot be negative.").default(0),
    refundMethod: z.enum(CANCEL_REFUND_METHODS).optional(),
  })
  .refine((v) => v.refundAmount === 0 || Boolean(v.refundMethod), {
    message: "Choose how the refund is paid (cash, bank or cheque).",
    path: ["refundMethod"],
  })

export type CancelSaleInput = z.input<typeof cancelSaleSchema>

export async function cancelSale(input: CancelSaleInput): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const user = await requirePermission("CANCEL_SALE")
    const parsed = cancelSaleSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the cancellation details." }
    const data = parsed.data
    const refundAmount = round2(data.refundAmount)
    const refundMethod = refundAmount > 0 ? (data.refundMethod ?? null) : null
    const actor = { id: user.id, name: user.name, organizationId: user.organizationId, branchId: user.branchId }

    const done = await prisma.$transaction(
      async (tx) => {
        const sale = await loadSaleForCancel(tx, user.organizationId, data.saleId, branchFilter(user))
        if (!sale) throw new Error("Sale not found in your dealership records.")

        const blockers = await findBlockers(tx, blockerInput(sale))
        if (blockers.length > 0) throw new Error(`This sale cannot be cancelled. ${blockers.map((b) => b.message).join(" ")}`)

        const maxRefund = maxRefundFor(sale)
        if (refundAmount > maxRefund + 0.005) {
          throw new Error(`The refund cannot be more than ${money(maxRefund)}, what the customer paid on this sale.`)
        }

        const now = new Date()

        // Compare-and-set so two people cancelling at once cannot both succeed.
        const claimed = await tx.sale.updateMany({
          where: { id: sale.id, organizationId: user.organizationId, status: { not: CANCELLED_SALE_STATUS } },
          data: {
            status: CANCELLED_SALE_STATUS,
            cancelledAt: now,
            cancelledById: user.id,
            cancelledByName: user.name,
            cancelType: data.type,
            cancelReason: data.reason,
            cancelRefundAmount: refundAmount,
            cancelRefundMethod: refundMethod,
            cancelAdvanceReleased: sale.advancePaymentId ? sale.advanceDeducted : 0,
            // Free the (unique) link so the advance can be used on another sale.
            advancePaymentId: null,
          },
        })
        if (claimed.count !== 1) throw new Error("This sale was already cancelled.")

        // Bike back into its branch's stock. The GRN (and so the aging date) is not touched.
        const restocked = await tx.vehicle.updateMany({
          where: { id: sale.vehicleId, organizationId: user.organizationId, status: VehicleStatus.Sold },
          data: { status: VehicleStatus.AVAILABLE, registrationNumber: null },
        })
        if (restocked.count !== 1) {
          throw new Error(`The bike is ${sale.vehicle.status}, not Sold, so it cannot go back into stock. Check the bike's page first.`)
        }

        await voidStaffCommissionForSale(tx, sale.id, `Sale cancelled: ${data.reason}`)

        const settled = sale.commissionSettlements.filter((s) => s.status === SettlementStatus.SETTLED).map((s) => s.type)
        await tx.commissionSettlement.updateMany({
          where: { saleId: sale.id, status: { not: SettlementStatus.CANCELLED } },
          data: { status: SettlementStatus.CANCELLED, updatedById: user.id },
        })

        await tx.financeDetail.updateMany({
          where: { saleId: sale.id },
          data: { status: FinanceStatus.Cancelled, balanceAmount: 0, expectedDate: null },
        })

        await tx.dMTRegistration.updateMany({ where: { saleId: sale.id }, data: { status: DMTStatus.Cancelled } })

        if (sale.advancePaymentId) {
          const released = await tx.advancePayment.updateMany({
            where: { id: sale.advancePaymentId, organizationId: user.organizationId, status: AdvancePaymentStatus.USED },
            data: { status: AdvancePaymentStatus.PENDING },
          })
          if (released.count !== 1) throw new Error("The customer advance used on this sale is no longer in the Used state, so it cannot be released.")
        }

        const parts = [
          `Invoice ${sale.invoiceNumber} cancelled (${CANCEL_TYPE_LABELS[data.type as CancelType]}): ${data.reason}`,
          `bike ${sale.vehicle.vehicleModel.brand} ${sale.vehicle.vehicleModel.modelName} ${sale.vehicle.chassisNumber} back in stock`,
          "staff commission voided",
          settled.length ? `commission already settled and now voided: ${settled.join(", ")}` : "commission settlements voided",
          sale.financeDetail ? "finance receivable cancelled" : null,
          sale.dmtRegistration ? "DMT record cancelled" : null,
          sale.advancePaymentId ? `advance ${money(sale.advanceDeducted)} back to Pending` : null,
          refundAmount > 0 ? `refund ${money(refundAmount)} by ${refundMethodLabel(refundMethod)}` : "no refund",
        ].filter(Boolean)
        await recordAudit(tx, actor, {
          action: "SALE_CANCELLED",
          entityType: "Sale",
          entityId: sale.id,
          branchId: sale.branchId,
          description: parts.join("; "),
        })

        return { saleId: sale.id, invoiceNumber: sale.invoiceNumber, vehicleId: sale.vehicleId }
      },
      { maxWait: 10000, timeout: 30000 },
    )

    for (const path of [
      "/dashboard",
      "/dashboard/sales",
      "/dashboard/sales/history",
      "/dashboard/sales/advances",
      `/dashboard/sales/${done.saleId}`,
      "/dashboard/grn/stock",
      "/dashboard/reports",
      "/dashboard/finance",
      "/dashboard/customers",
      "/dashboard/documents/rmv",
      `/dashboard/bikes/${done.vehicleId}`,
    ]) {
      revalidatePath(path)
    }
    return { success: true, message: `Sale ${done.invoiceNumber} cancelled. The bike is back in stock.` }
  } catch (error) {
    console.error("cancelSale error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unable to cancel this sale." }
  }
}
