"use server"

/**
 * Supplier monthly target commission: an incentive the SUPPLIER pays the DEALERSHIP per unit sold, depending on how much
 * of the monthly target was achieved. It is dealership income, so every function here is OWNER ONLY (requireOwner).
 */

import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { recordAudit } from "@/lib/audit"
import { requireOwner } from "@/lib/authorize"
import { colomboDayRange, colomboMonthKey, parseDateKey, parseMonthKey } from "@/lib/dates"
import { prisma } from "@/lib/prisma"
import {
  computeSupplierCommission,
  DEFAULT_SUPPLIER_SLABS,
  slabLabel,
  validateSlabs,
  type CommissionSlab,
} from "@/lib/supplier-commission"

type Client = Prisma.TransactionClient | typeof prisma

const PAGE = "/dashboard/suppliers/commission"
const SETTINGS_PAGE = "/dashboard/settings/supplier-commission"

function revalidate() {
  revalidatePath(PAGE)
  revalidatePath(SETTINGS_PAGE)
}

function failure(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) return { success: false as const, error: error.issues[0]?.message ?? fallback }
  return { success: false as const, error: error instanceof Error ? error.message : fallback }
}

function actorOf(owner: { id: string; name: string; organizationId: string; branchId?: string | null }) {
  return { id: owner.id, name: owner.name, organizationId: owner.organizationId, branchId: owner.branchId }
}

/** The organization's slabs, seeding the defaults the first time (new organizations start with them). */
async function loadSlabs(client: Client, organizationId: string): Promise<CommissionSlab[]> {
  let rows = await client.supplierCommissionSlab.findMany({ where: { organizationId }, orderBy: { fromPercent: "asc" } })
  if (rows.length === 0) {
    await client.supplierCommissionSlab.createMany({
      data: DEFAULT_SUPPLIER_SLABS.map((slab) => ({ organizationId, ...slab })),
      skipDuplicates: true,
    })
    rows = await client.supplierCommissionSlab.findMany({ where: { organizationId }, orderBy: { fromPercent: "asc" } })
  }
  return rows.map((row) => ({ fromPercent: row.fromPercent, amountPerUnit: row.amountPerUnit }))
}

function resolveMonth(month?: string) {
  const current = colomboMonthKey(new Date())
  const parsed = parseMonthKey(month) ?? parseMonthKey(current)!
  const key = `${parsed.year}-${String(parsed.month + 1).padStart(2, "0")}`
  const first = colomboDayRange(parsed.year, parsed.month, 1).start
  const last = colomboDayRange(parsed.year, parsed.month + 1, 0).end
  const label = new Date(Date.UTC(parsed.year, parsed.month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
  const prev = new Date(Date.UTC(parsed.year, parsed.month - 1, 1))
  const prevKey = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`
  return { key, first, last, label, prevKey, isFuture: key > current }
}

/**
 * Units sold per supplier in the month: completed (NOT cancelled) sales of bikes whose GRN came from that supplier.
 * Bikes without a GRN supplier are not counted for anyone.
 */
async function unitsBySupplier(client: Client, organizationId: string, first: Date, last: Date) {
  const items = await client.saleItem.findMany({
    where: { sale: { organizationId, status: "Completed", saleDate: { gte: first, lte: last } } },
    select: { vehicle: { select: { grn: { select: { supplierId: true } } } } },
  })
  const units = new Map<string, number>()
  for (const item of items) {
    const supplierId = item.vehicle.grn?.supplierId
    if (supplierId) units.set(supplierId, (units.get(supplierId) ?? 0) + 1)
  }
  return units
}

// ---------------------------------------------------------------------------------------------
// Slabs (Settings -> Sales Setup -> Supplier Commission)
// ---------------------------------------------------------------------------------------------

export interface SlabRow {
  fromPercent: number
  amountPerUnit: number
}

export async function getSupplierSlabs(): Promise<SlabRow[]> {
  const owner = await requireOwner()
  return loadSlabs(prisma, owner.organizationId)
}

const slabsSchema = z
  .array(z.object({ fromPercent: z.number().finite(), amountPerUnit: z.number().finite() }))
  .max(50, "Too many slabs.")

/** Replaces the whole ladder. Months that are already closed keep the slabs they were closed with. */
export async function saveSupplierSlabs(input: SlabRow[]) {
  try {
    const owner = await requireOwner()
    const slabs = slabsSchema.parse(input).map((slab) => ({
      fromPercent: Math.round(slab.fromPercent * 100) / 100,
      amountPerUnit: Math.round(slab.amountPerUnit * 100) / 100,
    }))
    const problem = validateSlabs(slabs)
    if (problem) return { success: false as const, error: problem }

    await prisma.$transaction(async (tx) => {
      const before = await loadSlabs(tx, owner.organizationId)
      await tx.supplierCommissionSlab.deleteMany({ where: { organizationId: owner.organizationId } })
      await tx.supplierCommissionSlab.createMany({ data: slabs.map((slab) => ({ organizationId: owner.organizationId, ...slab })) })
      const text = (list: CommissionSlab[]) =>
        [...list].sort((a, b) => a.fromPercent - b.fromPercent).map((s) => `${s.fromPercent}%=${s.amountPerUnit}`).join(", ")
      await recordAudit(tx, actorOf(owner), {
        action: "SUPPLIER_COMMISSION_SLABS_CHANGED",
        entityType: "SupplierCommissionSlab",
        description: `Supplier commission slabs changed. Before: ${text(before)}. After: ${text(slabs)}.`,
      })
    })
    revalidate()
    return { success: true as const, message: "Supplier commission slabs saved. Closed months are not affected." }
  } catch (error) {
    console.error("saveSupplierSlabs error:", error)
    return failure(error, "Could not save the slabs.")
  }
}

// ---------------------------------------------------------------------------------------------
// Monthly report, targets, closing, received
// ---------------------------------------------------------------------------------------------

export interface SupplierCommissionRow {
  supplierId: string
  supplierName: string
  targetUnits: number
  unitsSold: number
  achievementPercent: number
  /** "60%+ → Rs. 22,500", or "No slab" when nothing is earned. */
  slabText: string
  amountPerUnit: number
  totalCommission: number
  received: { receivedAt: string; reference: string | null; amount: number } | null
}

export interface SupplierCommissionReport {
  month: string
  monthLabel: string
  isFuture: boolean
  closed: { closedAt: string; closedByName: string | null } | null
  /** The slabs the figures use: the live ladder, or the snapshot when the month is closed. */
  slabs: SlabRow[]
  rows: SupplierCommissionRow[]
  totals: { targetUnits: number; unitsSold: number; commission: number; received: number }
  /** True when last month has targets that "copy last month's targets" could bring in. */
  canCopyPrevious: boolean
}

export async function getSupplierCommissionReport(month?: string): Promise<SupplierCommissionReport> {
  const owner = await requireOwner()
  const period = resolveMonth(month)
  const organizationId = owner.organizationId

  const [closedMonth, receipts] = await Promise.all([
    prisma.supplierCommissionMonth.findUnique({
      where: { organizationId_month: { organizationId, month: period.key } },
      include: { lines: true },
    }),
    prisma.supplierCommissionReceipt.findMany({ where: { organizationId, month: period.key } }),
  ])
  const receiptBySupplier = new Map(receipts.map((r) => [r.supplierId, r]))
  const receivedOf = (supplierId: string) => {
    const r = receiptBySupplier.get(supplierId)
    return r ? { receivedAt: r.receivedAt.toISOString(), reference: r.reference, amount: r.amount } : null
  }

  let slabs: CommissionSlab[]
  let rows: SupplierCommissionRow[]

  if (closedMonth) {
    slabs = (closedMonth.slabsSnapshot as unknown as CommissionSlab[]) ?? []
    rows = closedMonth.lines
      .map((line) => ({
        supplierId: line.supplierId,
        supplierName: line.supplierName,
        targetUnits: line.targetUnits,
        unitsSold: line.unitsSold,
        achievementPercent: line.achievementPercent,
        slabText: slabLabel(line.slabFromPercent === null ? null : { fromPercent: line.slabFromPercent, amountPerUnit: line.amountPerUnit }),
        amountPerUnit: line.amountPerUnit,
        totalCommission: line.totalCommission,
        received: receivedOf(line.supplierId),
      }))
      .sort((a, b) => a.supplierName.localeCompare(b.supplierName))
  } else {
    const [liveSlabs, suppliers, targets, units] = await Promise.all([
      loadSlabs(prisma, organizationId),
      prisma.supplier.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.supplierMonthlyTarget.findMany({ where: { organizationId, month: period.key } }),
      unitsBySupplier(prisma, organizationId, period.first, period.last),
    ])
    slabs = liveSlabs
    const targetBySupplier = new Map(targets.map((t) => [t.supplierId, t.targetUnits]))
    rows = suppliers.map((supplier) => {
      const figures = computeSupplierCommission(slabs, units.get(supplier.id) ?? 0, targetBySupplier.get(supplier.id) ?? 0)
      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        targetUnits: figures.targetUnits,
        unitsSold: figures.unitsSold,
        achievementPercent: figures.achievementPercent,
        slabText: slabLabel(figures.slab),
        amountPerUnit: figures.amountPerUnit,
        totalCommission: figures.totalCommission,
        received: receivedOf(supplier.id),
      }
    })
  }

  const prevTargets = await prisma.supplierMonthlyTarget.count({ where: { organizationId, month: period.prevKey } })

  return {
    month: period.key,
    monthLabel: period.label,
    isFuture: period.isFuture,
    closed: closedMonth ? { closedAt: closedMonth.closedAt.toISOString(), closedByName: closedMonth.closedByName } : null,
    slabs,
    rows,
    totals: {
      targetUnits: rows.reduce((sum, r) => sum + r.targetUnits, 0),
      unitsSold: rows.reduce((sum, r) => sum + r.unitsSold, 0),
      commission: rows.reduce((sum, r) => sum + r.totalCommission, 0),
      received: rows.reduce((sum, r) => sum + (r.received?.amount ?? 0), 0),
    },
    canCopyPrevious: prevTargets > 0 && !closedMonth,
  }
}

const targetSchema = z.object({
  supplierId: z.string().trim().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Choose a month."),
  targetUnits: z.number().int("The target must be a whole number of bikes.").min(0, "The target cannot be negative.").max(100000),
})

async function assertOpen(client: Client, organizationId: string, month: string) {
  const closed = await client.supplierCommissionMonth.findUnique({ where: { organizationId_month: { organizationId, month } } })
  if (closed) throw new Error("This month is closed. Reopen it to change targets.")
}

/** Sets (or, with 0, removes) one supplier's target for a month. */
export async function setSupplierTarget(input: z.infer<typeof targetSchema>) {
  try {
    const owner = await requireOwner()
    const data = targetSchema.parse(input)
    if (!parseMonthKey(data.month)) return { success: false as const, error: "Choose a valid month." }
    const supplier = await prisma.supplier.findFirst({ where: { id: data.supplierId, organizationId: owner.organizationId } })
    if (!supplier) return { success: false as const, error: "Supplier not found." }

    await prisma.$transaction(async (tx) => {
      await assertOpen(tx, owner.organizationId, data.month)
      const existing = await tx.supplierMonthlyTarget.findUnique({ where: { supplierId_month: { supplierId: supplier.id, month: data.month } } })
      if ((existing?.targetUnits ?? 0) === data.targetUnits) return
      if (data.targetUnits === 0) {
        await tx.supplierMonthlyTarget.deleteMany({ where: { supplierId: supplier.id, month: data.month } })
      } else {
        await tx.supplierMonthlyTarget.upsert({
          where: { supplierId_month: { supplierId: supplier.id, month: data.month } },
          create: { organizationId: owner.organizationId, supplierId: supplier.id, month: data.month, targetUnits: data.targetUnits },
          update: { targetUnits: data.targetUnits },
        })
      }
      await recordAudit(tx, actorOf(owner), {
        action: "SUPPLIER_TARGET_CHANGED",
        entityType: "SupplierMonthlyTarget",
        entityId: supplier.id,
        description: `${supplier.name}: target for ${data.month} changed from ${existing?.targetUnits ?? 0} to ${data.targetUnits} bikes`,
      })
    })
    revalidate()
    return { success: true as const }
  } catch (error) {
    console.error("setSupplierTarget error:", error)
    return failure(error, "Could not save the target.")
  }
}

/** Copies last month's targets to suppliers that have no target yet this month (existing targets are kept). */
export async function copyLastMonthTargets(month: string) {
  try {
    const owner = await requireOwner()
    const period = resolveMonth(month)
    const organizationId = owner.organizationId
    const copied = await prisma.$transaction(async (tx) => {
      await assertOpen(tx, organizationId, period.key)
      const [previous, current] = await Promise.all([
        tx.supplierMonthlyTarget.findMany({ where: { organizationId, month: period.prevKey } }),
        tx.supplierMonthlyTarget.findMany({ where: { organizationId, month: period.key } }),
      ])
      const have = new Set(current.map((t) => t.supplierId))
      const toCopy = previous.filter((t) => !have.has(t.supplierId))
      if (toCopy.length > 0) {
        await tx.supplierMonthlyTarget.createMany({
          data: toCopy.map((t) => ({ organizationId, supplierId: t.supplierId, month: period.key, targetUnits: t.targetUnits })),
          skipDuplicates: true,
        })
        await recordAudit(tx, actorOf(owner), {
          action: "SUPPLIER_TARGETS_COPIED",
          entityType: "SupplierMonthlyTarget",
          description: `Copied ${toCopy.length} supplier target(s) from ${period.prevKey} to ${period.key}`,
        })
      }
      return toCopy.length
    })
    revalidate()
    return {
      success: true as const,
      message: copied > 0 ? `Copied ${copied} target(s) from last month.` : "Nothing to copy: every supplier already has a target, or last month had none.",
    }
  } catch (error) {
    console.error("copyLastMonthTargets error:", error)
    return failure(error, "Could not copy last month's targets.")
  }
}

/** Saves a snapshot of the month's figures and the slabs used. Later changes never alter a closed month. */
export async function closeSupplierMonth(month: string) {
  try {
    const owner = await requireOwner()
    const period = resolveMonth(month)
    if (period.isFuture) return { success: false as const, error: "A future month cannot be closed yet." }
    const organizationId = owner.organizationId

    const total = await prisma.$transaction(async (tx) => {
      await assertOpen(tx, organizationId, period.key)
      const [slabs, suppliers, targets, units] = await Promise.all([
        loadSlabs(tx, organizationId),
        tx.supplier.findMany({ where: { organizationId }, select: { id: true, name: true } }),
        tx.supplierMonthlyTarget.findMany({ where: { organizationId, month: period.key } }),
        unitsBySupplier(tx, organizationId, period.first, period.last),
      ])
      const targetBySupplier = new Map(targets.map((t) => [t.supplierId, t.targetUnits]))
      const lines = suppliers
        .map((supplier) => ({ supplier, figures: computeSupplierCommission(slabs, units.get(supplier.id) ?? 0, targetBySupplier.get(supplier.id) ?? 0) }))
        .filter(({ figures }) => figures.targetUnits > 0 || figures.unitsSold > 0)

      const closed = await tx.supplierCommissionMonth.create({
        data: {
          organizationId,
          month: period.key,
          closedById: owner.id,
          closedByName: owner.name,
          slabsSnapshot: slabs as unknown as Prisma.InputJsonValue,
          lines: {
            create: lines.map(({ supplier, figures }) => ({
              supplierId: supplier.id,
              supplierName: supplier.name,
              targetUnits: figures.targetUnits,
              unitsSold: figures.unitsSold,
              achievementPercent: figures.achievementPercent,
              slabFromPercent: figures.slab?.fromPercent ?? null,
              amountPerUnit: figures.amountPerUnit,
              totalCommission: figures.totalCommission,
            })),
          },
        },
      })
      const sum = lines.reduce((acc, { figures }) => acc + figures.totalCommission, 0)
      await recordAudit(tx, actorOf(owner), {
        action: "SUPPLIER_COMMISSION_MONTH_CLOSED",
        entityType: "SupplierCommissionMonth",
        entityId: closed.id,
        description: `Closed supplier commission for ${period.key}: ${lines.length} supplier(s), total Rs. ${sum.toLocaleString("en-LK")}`,
      })
      return sum
    })
    revalidate()
    return { success: true as const, message: `${period.label} closed. Total supplier commission: Rs. ${total.toLocaleString("en-LK")}.` }
  } catch (error) {
    console.error("closeSupplierMonth error:", error)
    return failure(error, "Could not close the month.")
  }
}

/** Deletes the snapshot so the month is calculated live again. Received records are kept. */
export async function reopenSupplierMonth(month: string) {
  try {
    const owner = await requireOwner()
    const period = resolveMonth(month)
    await prisma.$transaction(async (tx) => {
      const closed = await tx.supplierCommissionMonth.findUnique({
        where: { organizationId_month: { organizationId: owner.organizationId, month: period.key } },
      })
      if (!closed) throw new Error("This month is not closed.")
      await tx.supplierCommissionMonth.delete({ where: { id: closed.id } })
      await recordAudit(tx, actorOf(owner), {
        action: "SUPPLIER_COMMISSION_MONTH_REOPENED",
        entityType: "SupplierCommissionMonth",
        entityId: closed.id,
        description: `Reopened supplier commission for ${period.key} (it was closed on ${closed.closedAt.toISOString().slice(0, 10)}); figures will be recalculated`,
      })
    })
    revalidate()
    return { success: true as const, message: `${period.label} reopened.` }
  } catch (error) {
    console.error("reopenSupplierMonth error:", error)
    return failure(error, "Could not reopen the month.")
  }
}

const receivedSchema = z.object({
  supplierId: z.string().trim().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  receivedAt: z.string().trim().min(1, "Enter the date the commission was received."),
  reference: z.string().trim().max(120, "The reference is too long.").optional().or(z.literal("")),
})

/** Marks one supplier's commission for the month as received (date, reference). The amount is the current total. */
export async function markSupplierCommissionReceived(input: z.infer<typeof receivedSchema>) {
  try {
    const owner = await requireOwner()
    const data = receivedSchema.parse(input)
    const day = parseDateKey(data.receivedAt)
    if (!day) return { success: false as const, error: "Enter a valid date." }
    // Noon UTC (17:30 in Colombo): the same calendar day in UTC and in Sri Lanka, so the date shows correctly everywhere.
    const receivedAt = new Date(Date.UTC(day.year, day.month, day.day, 12))
    const report = await getSupplierCommissionReport(data.month)
    const row = report.rows.find((r) => r.supplierId === data.supplierId)
    if (!row) return { success: false as const, error: "Supplier not found for this month." }
    if (row.totalCommission <= 0) return { success: false as const, error: "There is no commission to receive for this supplier this month." }

    await prisma.$transaction(async (tx) => {
      await tx.supplierCommissionReceipt.upsert({
        where: { organizationId_supplierId_month: { organizationId: owner.organizationId, supplierId: row.supplierId, month: data.month } },
        create: {
          organizationId: owner.organizationId,
          supplierId: row.supplierId,
          supplierName: row.supplierName,
          month: data.month,
          amount: row.totalCommission,
          receivedAt,
          reference: data.reference || null,
          recordedById: owner.id,
        },
        update: { amount: row.totalCommission, receivedAt, reference: data.reference || null, recordedById: owner.id },
      })
      await recordAudit(tx, actorOf(owner), {
        action: "SUPPLIER_COMMISSION_RECEIVED",
        entityType: "SupplierCommissionReceipt",
        entityId: row.supplierId,
        description: `${row.supplierName}: ${data.month} commission Rs. ${row.totalCommission.toLocaleString("en-LK")} received on ${data.receivedAt}${data.reference ? ` (ref ${data.reference})` : ""}`,
      })
    })
    revalidate()
    return { success: true as const, message: `Marked received: ${row.supplierName}.` }
  } catch (error) {
    console.error("markSupplierCommissionReceived error:", error)
    return failure(error, "Could not mark the commission as received.")
  }
}

export async function undoSupplierCommissionReceived(input: { supplierId: string; month: string }) {
  try {
    const owner = await requireOwner()
    const month = z.string().regex(/^\d{4}-\d{2}$/).parse(input.month)
    await prisma.$transaction(async (tx) => {
      const receipt = await tx.supplierCommissionReceipt.findUnique({
        where: { organizationId_supplierId_month: { organizationId: owner.organizationId, supplierId: input.supplierId, month } },
      })
      if (!receipt) throw new Error("This commission is not marked as received.")
      await tx.supplierCommissionReceipt.delete({ where: { id: receipt.id } })
      await recordAudit(tx, actorOf(owner), {
        action: "SUPPLIER_COMMISSION_RECEIVED_UNDONE",
        entityType: "SupplierCommissionReceipt",
        entityId: receipt.supplierId,
        description: `${receipt.supplierName}: ${month} commission is no longer marked as received (was Rs. ${receipt.amount.toLocaleString("en-LK")})`,
      })
    })
    revalidate()
    return { success: true as const }
  } catch (error) {
    console.error("undoSupplierCommissionReceived error:", error)
    return failure(error, "Could not undo.")
  }
}
