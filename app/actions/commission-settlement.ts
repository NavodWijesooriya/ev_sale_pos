"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordAudit } from "@/lib/audit"
import { requireOwner } from "@/lib/authorize"
import { colomboDateKey, colomboDayRange, parseDateKey } from "@/lib/dates"
import { prisma } from "@/lib/prisma"

// Every function here is owner-only (requireOwner). Staff cannot see or change settlement data.

export type SettlementTypeKey = "FINANCE" | "INSURANCE" | "RMV"
export type SettlementStatusKey = "PENDING" | "SETTLED"

export interface SettlementLine {
  key: string
  saleId: string
  invoiceNumber: string
  saleDate: string
  customerName: string
  type: SettlementTypeKey
  amount: number
  status: SettlementStatusKey
  settledAt: string | null
  reference: string | null
}

export interface SettlementFilters {
  type?: string
  status?: string
  from?: string
  to?: string
}

const TYPES: SettlementTypeKey[] = ["FINANCE", "INSURANCE", "RMV"]
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** Amount of a sale's finance commission: the explicit amount, else the stored finance commission. */
function financeAmountOf(sale: { commissionAmount: number; financeCommission: number | null }) {
  return sale.commissionAmount > 0 ? sale.commissionAmount : (sale.financeCommission ?? 0)
}

/**
 * One line per sale and commission type that actually has commission, with its settlement status
 * (no settlement row = PENDING). Filterable by type, status and sale date.
 */
export async function getCommissionSettlementLines(filters: SettlementFilters = {}) {
  const owner = await requireOwner()
  const type = TYPES.find((t) => t === filters.type)
  const status = filters.status === "PENDING" || filters.status === "SETTLED" ? filters.status : undefined

  const from = parseDateKey(filters.from)
  const to = parseDateKey(filters.to)
  const saleDate =
    from || to
      ? {
          ...(from ? { gte: colomboDayRange(from.year, from.month, from.day).start } : {}),
          ...(to ? { lte: colomboDayRange(to.year, to.month, to.day).end } : {}),
        }
      : undefined

  const sales = await prisma.sale.findMany({
    where: {
      organizationId: owner.organizationId,
      ...(saleDate ? { saleDate } : {}),
      OR: [
        { commissionAmount: { gt: 0 } },
        { financeCommission: { gt: 0 } },
        { insuranceCommission: { gt: 0 } },
        { commissionSettlements: { some: { type: "RMV" } } },
      ],
    },
    select: {
      id: true,
      invoiceNumber: true,
      saleDate: true,
      commissionAmount: true,
      financeCommission: true,
      insuranceCommission: true,
      customer: { select: { name: true } },
      commissionSettlements: { select: { type: true, status: true, amount: true, settledAt: true, reference: true } },
    },
    orderBy: { saleDate: "desc" },
    take: 1000,
  })

  const lines: SettlementLine[] = []
  for (const sale of sales) {
    const rows = new Map(sale.commissionSettlements.map((r) => [r.type, r]))
    const candidates: Array<[SettlementTypeKey, number]> = [
      ["FINANCE", financeAmountOf(sale)],
      ["INSURANCE", sale.insuranceCommission ?? 0],
      ["RMV", rows.get("RMV")?.amount ?? 0],
    ]
    for (const [lineType, liveAmount] of candidates) {
      if (liveAmount <= 0) continue
      if (type && lineType !== type) continue
      const row = rows.get(lineType)
      const lineStatus: SettlementStatusKey = row?.status ?? "PENDING"
      if (status && lineStatus !== status) continue
      lines.push({
        key: `${sale.id}:${lineType}`,
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        saleDate: sale.saleDate.toISOString(),
        customerName: sale.customer.name,
        type: lineType,
        // A settled line keeps the amount that was agreed when it was settled
        amount: round2(lineStatus === "SETTLED" && row ? row.amount : liveAmount),
        status: lineStatus,
        settledAt: row?.settledAt?.toISOString() ?? null,
        reference: row?.reference ?? null,
      })
    }
  }

  const sum = (s: SettlementStatusKey) => round2(lines.filter((l) => l.status === s).reduce((t, l) => t + l.amount, 0))
  return { lines, pendingTotal: sum("PENDING"), settledTotal: sum("SETTLED") }
}

const updateSchema = z.object({
  saleId: z.string().trim().min(1),
  type: z.enum(["FINANCE", "INSURANCE", "RMV"]),
  status: z.enum(["PENDING", "SETTLED"]),
  settledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  reference: z.string().trim().max(300).optional().or(z.literal("")),
  /** RMV commission has no calculated amount, so the owner enters it. Ignored for finance / insurance. */
  amount: z.number().finite().min(0).max(100_000_000).optional(),
})
export type UpdateSettlementInput = z.infer<typeof updateSchema>

export async function updateCommissionSettlement(input: UpdateSettlementInput) {
  try {
    const owner = await requireOwner()
    const data = updateSchema.parse(input)
    const actor = { id: owner.id, name: owner.name, organizationId: owner.organizationId, branchId: owner.branchId }

    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: data.saleId, organizationId: owner.organizationId },
        select: {
          id: true,
          invoiceNumber: true,
          branchId: true,
          commissionAmount: true,
          financeCommission: true,
          insuranceCommission: true,
        },
      })
      if (!sale) throw new Error("Sale not found.")

      const existing = await tx.commissionSettlement.findUnique({
        where: { saleId_type: { saleId: sale.id, type: data.type } },
      })

      let amount: number
      if (data.type === "FINANCE") amount = financeAmountOf(sale)
      else if (data.type === "INSURANCE") amount = sale.insuranceCommission ?? 0
      else amount = data.amount ?? existing?.amount ?? 0
      if (amount <= 0) throw new Error(`This sale has no ${data.type.toLowerCase()} commission to settle.`)

      const settled = data.status === "SETTLED"
      const settledOn = data.settledDate ? parseDateKey(data.settledDate) : null
      if (settled && data.settledDate && !settledOn) throw new Error("Enter a valid settlement date.")
      const settledAt = settled ? (settledOn ? colomboDayRange(settledOn.year, settledOn.month, settledOn.day).start : new Date()) : null

      await tx.commissionSettlement.upsert({
        where: { saleId_type: { saleId: sale.id, type: data.type } },
        create: {
          organizationId: owner.organizationId,
          saleId: sale.id,
          type: data.type,
          status: data.status,
          amount: round2(amount),
          settledAt,
          reference: data.reference || null,
          updatedById: owner.id,
        },
        update: {
          status: data.status,
          amount: round2(amount),
          settledAt,
          reference: data.reference || null,
          updatedById: owner.id,
        },
      })

      await recordAudit(tx, actor, {
        action: "COMMISSION_SETTLEMENT_CHANGED",
        entityType: "Sale",
        entityId: sale.id,
        branchId: sale.branchId,
        description: `${sale.invoiceNumber}: ${data.type} commission ${round2(amount).toFixed(2)} ${existing?.status ?? "PENDING"} -> ${data.status}${
          settled ? ` on ${colomboDateKey(settledAt as Date)}` : ""
        }${data.reference ? ` (ref: ${data.reference})` : ""}`,
      })
    })

    revalidatePath("/dashboard/finance/commissions")
    return { success: true as const, message: "Settlement updated." }
  } catch (error) {
    console.error("updateCommissionSettlement error:", error)
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "Enter valid values.")
        : error instanceof Error
          ? error.message
          : "Could not update the settlement."
    return { success: false as const, message }
  }
}

/** Adds an RMV commission line to a sale (found by invoice number); the owner supplies the amount. */
export async function addRmvCommission(input: { invoiceNumber: string; amount: number; reference?: string }) {
  try {
    const owner = await requireOwner()
    const invoiceNumber = input.invoiceNumber?.trim()
    if (!invoiceNumber) throw new Error("Enter the invoice number.")
    if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Enter an amount above zero.")

    const sale = await prisma.sale.findFirst({
      where: { invoiceNumber, organizationId: owner.organizationId },
      select: { id: true },
    })
    if (!sale) throw new Error("No sale with that invoice number.")

    return await updateCommissionSettlement({
      saleId: sale.id,
      type: "RMV",
      status: "PENDING",
      amount: input.amount,
      reference: input.reference,
    })
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "Could not add the RMV commission." }
  }
}
