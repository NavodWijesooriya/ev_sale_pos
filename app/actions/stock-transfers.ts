"use server"

import { VehicleStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { recordAudit } from "@/lib/audit"
import { requireAnyPermission } from "@/lib/authorize"
import { branchFilter } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

/**
 * Inter-branch stock transfers.
 *
 *   dispatch (source branch)  -> bikes become InTransit and leave the source stock
 *   receive  (destination)    -> bikes become AVAILABLE in the destination branch
 *   cancel   (before receipt) -> bikes go back to the source stock
 *
 * Every state change is a compare-and-set update (status guard in the WHERE clause), so a bike cannot be
 * transferred twice, sold while in transit, or received / cancelled more than once.
 * Bikes keep their GRN, so inventory aging still counts from the original received date.
 */

type Result<T = object> = ({ success: true; message: string } & T) | { success: false; message: string }

const TRANSFER_NUMBER_LOCK = 874230603
const MAX_BIKES = 99

async function requireTransferUser() {
  const user = await requireAnyPermission("TRANSFER_STOCK")
  const actor = { id: user.id, name: user.name, organizationId: user.organizationId, branchId: user.branchId }
  return { user, actor, organizationId: user.organizationId, ownBranchId: branchFilter(user).branchId }
}

function failure(label: string, error: unknown): { success: false; message: string } {
  console.error(`${label} error:`, error)
  return { success: false, message: error instanceof Error ? error.message : "Something went wrong." }
}

function revalidate() {
  revalidatePath("/dashboard/grn/transfers")
  revalidatePath("/dashboard/grn/stock")
  revalidatePath("/dashboard/sales/new")
  revalidatePath("/dashboard/reports")
  revalidatePath("/dashboard")
}

export interface StockTransferRow {
  id: string
  transferNumber: string
  status: "IN_TRANSIT" | "RECEIVED" | "CANCELLED"
  fromBranch: { id: string; name: string }
  toBranch: { id: string; name: string }
  notes: string | null
  dispatchedByName: string
  dispatchedAt: string
  receivedByName: string | null
  receivedAt: string | null
  cancelledByName: string | null
  cancelledAt: string | null
  cancelReason: string | null
  bikes: Array<{ id: string; chassisNumber: string; model: string; unitGrnNumber: string | null }>
  canReceive: boolean
  canCancel: boolean
}

export interface TransferOptions {
  branches: Array<{ id: string; name: string }>
  /** Branches the user may dispatch from (their own, or all for owners). */
  fromBranchIds: string[]
  bikes: Array<{ id: string; branchId: string; chassisNumber: string; model: string; unitGrnNumber: string | null }>
}

/** Branches and the bikes that can be dispatched right now (in stock). */
export async function getTransferOptions(): Promise<TransferOptions> {
  const { organizationId, ownBranchId } = await requireTransferUser()
  const [branches, bikes] = await Promise.all([
    prisma.branch.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.vehicle.findMany({
      where: { organizationId, status: VehicleStatus.AVAILABLE, ...(ownBranchId ? { branchId: ownBranchId } : {}) },
      select: {
        id: true,
        branchId: true,
        chassisNumber: true,
        unitGrnNumber: true,
        vehicleModel: { select: { brand: true, modelName: true } },
      },
      orderBy: [{ branchId: "asc" }, { chassisNumber: "asc" }],
    }),
  ])
  return {
    branches,
    fromBranchIds: ownBranchId ? [ownBranchId] : branches.map((b) => b.id),
    bikes: bikes.map((v) => ({
      id: v.id,
      branchId: v.branchId,
      chassisNumber: v.chassisNumber,
      unitGrnNumber: v.unitGrnNumber,
      model: `${v.vehicleModel.brand} ${v.vehicleModel.modelName}`,
    })),
  }
}

/** Transfers the user may see: all for owners, otherwise those leaving from or arriving at their branch. */
export async function getStockTransfers(): Promise<StockTransferRow[]> {
  const { organizationId, ownBranchId } = await requireTransferUser()
  const rows = await prisma.stockTransfer.findMany({
    where: {
      organizationId,
      ...(ownBranchId ? { OR: [{ fromBranchId: ownBranchId }, { toBranchId: ownBranchId }] } : {}),
    },
    include: {
      fromBranch: { select: { id: true, name: true } },
      toBranch: { select: { id: true, name: true } },
      items: {
        include: {
          vehicle: {
            select: {
              id: true,
              chassisNumber: true,
              unitGrnNumber: true,
              vehicleModel: { select: { brand: true, modelName: true } },
            },
          },
        },
      },
    },
    orderBy: { dispatchedAt: "desc" },
    take: 200,
  })
  return rows.map((t) => {
    const inTransit = t.status === "IN_TRANSIT"
    return {
      id: t.id,
      transferNumber: t.transferNumber,
      status: t.status,
      fromBranch: t.fromBranch,
      toBranch: t.toBranch,
      notes: t.notes,
      dispatchedByName: t.dispatchedByName,
      dispatchedAt: t.dispatchedAt.toISOString(),
      receivedByName: t.receivedByName,
      receivedAt: t.receivedAt?.toISOString() ?? null,
      cancelledByName: t.cancelledByName,
      cancelledAt: t.cancelledAt?.toISOString() ?? null,
      cancelReason: t.cancelReason,
      bikes: t.items.map((i) => ({
        id: i.vehicle.id,
        chassisNumber: i.vehicle.chassisNumber,
        unitGrnNumber: i.vehicle.unitGrnNumber,
        model: `${i.vehicle.vehicleModel.brand} ${i.vehicle.vehicleModel.modelName}`,
      })),
      // Branch staff receive into their own branch and cancel from their own branch only.
      canReceive: inTransit && (!ownBranchId || t.toBranchId === ownBranchId),
      canCancel: inTransit && (!ownBranchId || t.fromBranchId === ownBranchId),
    }
  })
}

export async function dispatchStockTransfer(input: {
  fromBranchId: string
  toBranchId: string
  vehicleIds: string[]
  notes?: string
}): Promise<Result<{ transferNumber: string }>> {
  try {
    const { organizationId, actor, user, ownBranchId } = await requireTransferUser()
    const vehicleIds = [...new Set((input.vehicleIds ?? []).filter(Boolean))]
    if (vehicleIds.length === 0) throw new Error("Select at least one bike to transfer.")
    if (vehicleIds.length > MAX_BIKES) throw new Error(`A transfer can hold at most ${MAX_BIKES} bikes.`)
    if (input.fromBranchId === input.toBranchId) throw new Error("Choose two different branches.")
    // Branch staff can only dispatch out of their own branch.
    if (ownBranchId && input.fromBranchId !== ownBranchId) {
      throw new Error("You can only dispatch stock from your own branch.")
    }
    const notes = input.notes?.trim().slice(0, 500) || null

    const result = await prisma.$transaction(
      async (tx) => {
        const branches = await tx.branch.findMany({
          where: { organizationId, id: { in: [input.fromBranchId, input.toBranchId] } },
          select: { id: true, name: true },
        })
        const from = branches.find((b) => b.id === input.fromBranchId)
        const to = branches.find((b) => b.id === input.toBranchId)
        if (!from || !to) throw new Error("Branch not found.")

        // Compare-and-set: only bikes that are in stock at the source branch right now are moved.
        const moved = await tx.vehicle.updateMany({
          where: { id: { in: vehicleIds }, organizationId, branchId: from.id, status: VehicleStatus.AVAILABLE },
          data: { status: VehicleStatus.InTransit },
        })
        if (moved.count !== vehicleIds.length) {
          throw new Error(
            "Some of the selected bikes are no longer in stock at the source branch (sold, reserved or already in transit). Refresh and try again.",
          )
        }

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${TRANSFER_NUMBER_LOCK}::int, hashtext(${organizationId}))`
        const count = await tx.stockTransfer.count({ where: { organizationId } })
        const transferNumber = `ST-${String(count + 1).padStart(5, "0")}`
        const transfer = await tx.stockTransfer.create({
          data: {
            organizationId,
            transferNumber,
            fromBranchId: from.id,
            toBranchId: to.id,
            notes,
            dispatchedById: user.id,
            dispatchedByName: user.name,
            items: { create: vehicleIds.map((vehicleId) => ({ vehicleId })) },
          },
        })
        await recordAudit(tx, actor, {
          action: "STOCK_TRANSFER_DISPATCHED",
          entityType: "StockTransfer",
          entityId: transfer.id,
          branchId: from.id,
          description: `${transferNumber}: ${vehicleIds.length} bike(s) dispatched ${from.name} -> ${to.name}`,
        })
        return { transferNumber }
      },
      { maxWait: 10000, timeout: 30000 },
    )

    revalidate()
    return { success: true, message: `Transfer ${result.transferNumber} dispatched.`, ...result }
  } catch (error) {
    return failure("dispatchStockTransfer", error)
  }
}

export async function receiveStockTransfer(input: { transferId: string }): Promise<Result> {
  try {
    const { organizationId, actor, user, ownBranchId } = await requireTransferUser()
    await prisma.$transaction(
      async (tx) => {
        const transfer = await tx.stockTransfer.findFirst({
          where: { id: input.transferId, organizationId },
          include: {
            items: { select: { vehicleId: true } },
            fromBranch: { select: { name: true } },
            toBranch: { select: { name: true } },
          },
        })
        if (!transfer) throw new Error("Transfer not found.")
        if (ownBranchId && transfer.toBranchId !== ownBranchId) {
          throw new Error("Only the destination branch can receive this transfer.")
        }

        // Compare-and-set on the transfer: it can be received exactly once.
        const closed = await tx.stockTransfer.updateMany({
          where: { id: transfer.id, organizationId, status: "IN_TRANSIT" },
          data: { status: "RECEIVED", receivedById: user.id, receivedByName: user.name, receivedAt: new Date() },
        })
        if (closed.count !== 1) throw new Error("This transfer was already received or cancelled.")

        const vehicleIds = transfer.items.map((i) => i.vehicleId)
        const arrived = await tx.vehicle.updateMany({
          where: { id: { in: vehicleIds }, organizationId, branchId: transfer.fromBranchId, status: VehicleStatus.InTransit },
          data: { status: VehicleStatus.AVAILABLE, branchId: transfer.toBranchId },
        })
        if (arrived.count !== vehicleIds.length) {
          throw new Error("The bikes in this transfer are not all in transit any more. Nothing was changed.")
        }

        await recordAudit(tx, actor, {
          action: "STOCK_TRANSFER_RECEIVED",
          entityType: "StockTransfer",
          entityId: transfer.id,
          branchId: transfer.toBranchId,
          description: `${transfer.transferNumber}: ${vehicleIds.length} bike(s) received at ${transfer.toBranch.name} from ${transfer.fromBranch.name}`,
        })
      },
      { maxWait: 10000, timeout: 30000 },
    )

    revalidate()
    return { success: true, message: "Transfer received. The bikes are now in this branch's stock." }
  } catch (error) {
    return failure("receiveStockTransfer", error)
  }
}

export async function cancelStockTransfer(input: { transferId: string; reason?: string }): Promise<Result> {
  try {
    const { organizationId, actor, user, ownBranchId } = await requireTransferUser()
    const reason = input.reason?.trim().slice(0, 500) || null
    await prisma.$transaction(
      async (tx) => {
        const transfer = await tx.stockTransfer.findFirst({
          where: { id: input.transferId, organizationId },
          include: { items: { select: { vehicleId: true } }, fromBranch: { select: { name: true } } },
        })
        if (!transfer) throw new Error("Transfer not found.")
        if (ownBranchId && transfer.fromBranchId !== ownBranchId) {
          throw new Error("Only the source branch can cancel this transfer.")
        }

        const closed = await tx.stockTransfer.updateMany({
          where: { id: transfer.id, organizationId, status: "IN_TRANSIT" },
          data: {
            status: "CANCELLED",
            cancelledById: user.id,
            cancelledByName: user.name,
            cancelledAt: new Date(),
            cancelReason: reason,
          },
        })
        if (closed.count !== 1) throw new Error("This transfer was already received or cancelled.")

        const vehicleIds = transfer.items.map((i) => i.vehicleId)
        const back = await tx.vehicle.updateMany({
          where: { id: { in: vehicleIds }, organizationId, branchId: transfer.fromBranchId, status: VehicleStatus.InTransit },
          data: { status: VehicleStatus.AVAILABLE },
        })
        if (back.count !== vehicleIds.length) {
          throw new Error("The bikes in this transfer are not all in transit any more. Nothing was changed.")
        }

        await recordAudit(tx, actor, {
          action: "STOCK_TRANSFER_CANCELLED",
          entityType: "StockTransfer",
          entityId: transfer.id,
          branchId: transfer.fromBranchId,
          description: `${transfer.transferNumber}: cancelled, ${vehicleIds.length} bike(s) returned to ${transfer.fromBranch.name}${reason ? `: ${reason}` : ""}`,
        })
      },
      { maxWait: 10000, timeout: 30000 },
    )

    revalidate()
    return { success: true, message: "Transfer cancelled. The bikes are back in the source branch's stock." }
  } catch (error) {
    return failure("cancelStockTransfer", error)
  }
}
