"use server"

import { activeSale } from "@/lib/sale-status"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordAudit } from "@/lib/audit"
import { requireOwner } from "@/lib/authorize"
import { colomboDayRange, colomboMonthKey, parseDateKey, parseMonthKey, colomboDateKey } from "@/lib/dates"
import { prisma } from "@/lib/prisma"
import { ratesInForce } from "@/lib/staff-compensation"
import {

  commissionsFor,
  describeRate,
  NO_COMPENSATION,
  rateError,
  RATE_TYPES,
  round2,
  toRates,
  type CompensationRates,
} from "@/lib/staff-pay"

/**
 * Staff salary and the commission staff EARN on their sales. Every function here is owner-only (requireOwner):
 * nobody else can read or change any of it. Not related to the dealership's own finance / insurance commission.
 */

const rateSchema = z.object({
  basicSalary: z.number({ error: "Basic salary must be a number." }),
  saleCommissionType: z.enum(RATE_TYPES),
  saleCommissionValue: z.number({ error: "Sale commission must be a number." }),
  financeCommissionType: z.enum(RATE_TYPES),
  financeCommissionValue: z.number({ error: "Finance commission must be a number." }),
})

export type StaffPayInput = z.infer<typeof rateSchema>

/** First problem with the rates, if any. */
function validateRates(rates: CompensationRates): string | null {
  return (
    rateError("Basic salary", "FIXED", rates.basicSalary) ??
    rateError("Sale commission", rates.saleCommissionType, rates.saleCommissionValue) ??
    rateError("Finance commission", rates.financeCommissionType, rates.financeCommissionValue)
  )
}

function describeRates(rates: CompensationRates) {
  return `salary ${rates.basicSalary}, sale commission ${describeRate(rates.saleCommissionType, rates.saleCommissionValue, "bike")}, finance commission ${describeRate(rates.financeCommissionType, rates.financeCommissionValue, "finance")}`
}

export interface PayHistoryRow {
  id: string
  effectiveFrom: string
  rates: CompensationRates
  changedAt: string
}

export interface StaffPayProfile {
  id: string
  name: string
  email: string
  role: string
  branchName: string
  isActive: boolean
  /** In force today, or null when nothing has been set. */
  current: CompensationRates | null
  history: PayHistoryRow[]
}

export interface MonthSaleRow {
  saleId: string
  date: string
  invoiceNumber: string
  model: string
  paymentType: "CASH" | "FINANCE"
  saleCommission: number
  financeCommission: number
  /** The sale was voided / cancelled, so it earns nothing. */
  voided: boolean
  /** No commission was saved for this sale (made before pay was set up). */
  noCommission: boolean
}

export interface StaffMonthPay {
  profile: StaffPayProfile
  month: string
  monthLabel: string
  sales: MonthSaleRow[]
  basicSalary: number
  totalSaleCommission: number
  totalFinanceCommission: number
  totalPayable: number
}

function resolveMonth(month?: string) {
  const parsed = parseMonthKey(month) ?? parseMonthKey(colomboMonthKey(new Date()))!
  const key = `${parsed.year}-${String(parsed.month + 1).padStart(2, "0")}`
  const first = colomboDayRange(parsed.year, parsed.month, 1).start
  const last = colomboDayRange(parsed.year, parsed.month + 1, 0).end // day 0 = last day of this month
  const label = new Date(Date.UTC(parsed.year, parsed.month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
  return { key, first, last, label }
}

async function loadProfile(organizationId: string, userId: string): Promise<StaffPayProfile | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    include: { branch: { select: { name: true } } },
  })
  if (!user) return null
  const [rows, current] = await Promise.all([
    prisma.staffCompensation.findMany({ where: { userId }, orderBy: { effectiveFrom: "desc" } }),
    ratesInForce(prisma, userId, new Date()),
  ])
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branchName: user.branch?.name ?? "All Branches (HQ)",
    isActive: user.isActive,
    current,
    history: rows.map((row) => ({
      id: row.id,
      effectiveFrom: colomboDateKey(row.effectiveFrom),
      rates: toRates(row),
      changedAt: row.createdAt.toISOString(),
    })),
  }
}

/** Owner only: one staff member's pay settings and one month of their sales and earnings. */
export async function getStaffMonthPay(userId: string, month?: string): Promise<StaffMonthPay | null> {
  const owner = await requireOwner()
  const profile = await loadProfile(owner.organizationId, userId)
  if (!profile) return null
  const period = resolveMonth(month)

  const [sales, salaryRates] = await Promise.all([
    prisma.sale.findMany({
      where: { organizationId: owner.organizationId, userId, saleDate: { gte: period.first, lte: period.last } },
      orderBy: { saleDate: "asc" },
      select: {
        id: true,
        saleDate: true,
        invoiceNumber: true,
        paymentType: true,
        status: true,
        vehicle: { select: { vehicleModel: { select: { brand: true, modelName: true } } } },
        staffCommission: { select: { saleCommission: true, financeCommission: true, status: true } },
      },
    }),
    // Salary for the month = the basic salary in force on its last day.
    ratesInForce(prisma, userId, period.last),
  ])

  const rows: MonthSaleRow[] = sales.map((sale) => {
    const commission = sale.staffCommission
    const voided = sale.status !== "Completed" || commission?.status === "VOIDED"
    const earns = Boolean(commission) && !voided
    return {
      saleId: sale.id,
      date: colomboDateKey(sale.saleDate),
      invoiceNumber: sale.invoiceNumber,
      model: `${sale.vehicle.vehicleModel.brand} ${sale.vehicle.vehicleModel.modelName}`,
      paymentType: sale.paymentType === "FINANCE" ? "FINANCE" : "CASH",
      saleCommission: earns ? commission!.saleCommission : 0,
      financeCommission: earns ? commission!.financeCommission : 0,
      voided,
      noCommission: !commission,
    }
  })

  const totalSaleCommission = round2(rows.reduce((sum, row) => sum + row.saleCommission, 0))
  const totalFinanceCommission = round2(rows.reduce((sum, row) => sum + row.financeCommission, 0))
  const basicSalary = salaryRates?.basicSalary ?? 0
  return {
    profile,
    month: period.key,
    monthLabel: period.label,
    sales: rows,
    basicSalary,
    totalSaleCommission,
    totalFinanceCommission,
    totalPayable: round2(basicSalary + totalSaleCommission + totalFinanceCommission),
  }
}

/** Owner only. Rates and history for one staff member (used by the edit dialogs). */
export async function getStaffPaySettings(userId: string): Promise<StaffPayProfile | null> {
  const owner = await requireOwner()
  return loadProfile(owner.organizationId, userId)
}

const saveSchema = z.object({
  userId: z.string().min(1),
  /** YYYY-MM-DD (Colombo). Commissions on sales made before this day are not affected. */
  effectiveFrom: z.string(),
  rates: rateSchema,
})

/**
 * Owner only. Saves new pay settings starting on `effectiveFrom`. Earlier history stays, and commissions already
 * earned are never changed: each sale keeps the rates that were in force when it was made.
 */
export async function saveStaffPay(input: z.input<typeof saveSchema>) {
  try {
    const owner = await requireOwner()
    const data = saveSchema.parse(input)
    const day = parseDateKey(data.effectiveFrom)
    if (!day) return { success: false as const, message: "Enter a valid effective-from date." }
    const problem = validateRates(data.rates)
    if (problem) return { success: false as const, message: problem }
    const effectiveFrom = colomboDayRange(day.year, day.month, day.day).start

    const actor = { id: owner.id, name: owner.name, organizationId: owner.organizationId, branchId: owner.branchId }
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findFirst({
        where: { id: data.userId, organizationId: owner.organizationId },
        select: { id: true, name: true },
      })
      if (!target) throw new Error("Staff member not found.")

      const before = (await ratesInForce(tx, target.id, effectiveFrom)) ?? NO_COMPENSATION
      const same =
        before.basicSalary === data.rates.basicSalary &&
        before.saleCommissionType === data.rates.saleCommissionType &&
        before.saleCommissionValue === data.rates.saleCommissionValue &&
        before.financeCommissionType === data.rates.financeCommissionType &&
        before.financeCommissionValue === data.rates.financeCommissionValue
      const existing = await tx.staffCompensation.findUnique({
        where: { userId_effectiveFrom: { userId: target.id, effectiveFrom } },
      })
      if (same && !existing) return { changed: false as const }

      await tx.staffCompensation.upsert({
        where: { userId_effectiveFrom: { userId: target.id, effectiveFrom } },
        create: { organizationId: owner.organizationId, userId: target.id, effectiveFrom, createdById: owner.id, ...data.rates },
        update: { createdById: owner.id, ...data.rates },
      })
      await recordAudit(tx, actor, {
        action: "STAFF_PAY_CHANGED",
        entityType: "User",
        entityId: target.id,
        description: `${target.name} from ${data.effectiveFrom}: ${describeRates(before)} -> ${describeRates(data.rates)}`,
      })
      return { changed: true as const }
    })

    revalidatePath("/dashboard/settings/users")
    revalidatePath(`/dashboard/settings/users/${data.userId}`)
    revalidatePath("/dashboard/settings/payroll")
    return {
      success: true as const,
      message: result.changed ? "Pay settings saved." : "No changes to save.",
    }
  } catch (error) {
    console.error("saveStaffPay error:", error)
    return {
      success: false as const,
      message:
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? "Enter valid values.")
          : error instanceof Error
            ? error.message
            : "Could not save pay settings.",
    }
  }
}

/**
 * Owner only. Works out staff commission with TODAY's rates for this month's sales that earned nothing so far
 * (made before pay was set up) or were recalculated before. Commissions earned at the time of a sale are not touched.
 */
export async function recalculateStaffMonth(userId: string, month?: string) {
  try {
    const owner = await requireOwner()
    const period = resolveMonth(month)
    const actor = { id: owner.id, name: owner.name, organizationId: owner.organizationId, branchId: owner.branchId }

    const result = await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findFirst({
          where: { id: userId, organizationId: owner.organizationId },
          select: { id: true, name: true },
        })
        if (!target) throw new Error("Staff member not found.")
        const rates = await ratesInForce(tx, target.id, new Date())
        if (!rates) throw new Error("Set this staff member's salary and commission first.")

        const sales = await tx.sale.findMany({
          where: {
            organizationId: owner.organizationId,
            userId,
            status: "Completed",
            saleDate: { gte: period.first, lte: period.last },
          },
          select: {
            id: true,
            saleDate: true,
            paymentType: true,
            financeAmount: true,
            originalFinanceAmount: true,
            items: { select: { price: true } },
            staffCommission: { select: { source: true, status: true } },
          },
        })

        let done = 0
        let total = 0
        for (const sale of sales) {
          const existing = sale.staffCommission
          // Already earned when the sale was made (or voided): leave it alone.
          if (existing && (existing.source === "SALE" || existing.status === "VOIDED")) continue
          const bikePrice = sale.items.reduce((sum, item) => sum + item.price, 0)
          const isFinance = sale.paymentType === "FINANCE"
          // Commission stays based on the finance amount the sale was made with, even if a lower DO amount later changed the split.
          const commissionFinanceAmount = sale.originalFinanceAmount ?? sale.financeAmount
          const amounts = commissionsFor(rates, { paymentType: sale.paymentType, financeAmount: commissionFinanceAmount, bikePrice })
          const row = {
            organizationId: owner.organizationId,
            userId,
            saleDate: sale.saleDate,
            saleCommission: amounts.saleCommission,
            financeCommission: amounts.financeCommission,
            bikePrice,
            financeAmount: isFinance ? commissionFinanceAmount : 0,
            saleCommissionType: rates.saleCommissionType,
            saleCommissionValue: rates.saleCommissionValue,
            financeCommissionType: rates.financeCommissionType,
            financeCommissionValue: rates.financeCommissionValue,
            source: "RECALCULATED",
            status: "ACTIVE",
          }
          await tx.staffSaleCommission.upsert({
            where: { saleId: sale.id },
            create: { saleId: sale.id, ...row },
            update: row,
          })
          done += 1
          total += amounts.saleCommission + amounts.financeCommission
        }

        await recordAudit(tx, actor, {
          action: "STAFF_COMMISSION_RECALCULATED",
          entityType: "User",
          entityId: target.id,
          description: `${target.name}, ${period.label}: staff commission recalculated for ${done} sale(s) with current rates (${describeRates(rates)}), total ${round2(total)}`,
        })
        return { done, total: round2(total) }
      },
      { maxWait: 10000, timeout: 30000 },
    )

    revalidatePath(`/dashboard/settings/users/${userId}`)
    revalidatePath("/dashboard/settings/payroll")
    return {
      success: true as const,
      message: result.done
        ? `Recalculated ${result.done} sale(s) with the current rates.`
        : "Nothing to recalculate: every sale this month already has its commission.",
    }
  } catch (error) {
    console.error("recalculateStaffMonth error:", error)
    return { success: false as const, message: error instanceof Error ? error.message : "Could not recalculate." }
  }
}

export interface PayrollRow {
  userId: string
  name: string
  role: string
  isActive: boolean
  salesCount: number
  basicSalary: number
  saleCommission: number
  financeCommission: number
  totalPayable: number
}

export interface PayrollSummary {
  month: string
  monthLabel: string
  rows: PayrollRow[]
  totals: { basicSalary: number; saleCommission: number; financeCommission: number; totalPayable: number }
}

/** Owner only: one row per staff member for the month. */
export async function getPayrollSummary(month?: string): Promise<PayrollSummary> {
  const owner = await requireOwner()
  const period = resolveMonth(month)

  const [users, compensations, commissions, salesCounts] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: owner.organizationId },
      select: { id: true, name: true, role: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.staffCompensation.findMany({
      where: { organizationId: owner.organizationId, effectiveFrom: { lte: period.last } },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.staffSaleCommission.findMany({
      where: {
        organizationId: owner.organizationId,
        status: "ACTIVE",
        saleDate: { gte: period.first, lte: period.last },
        sale: { status: "Completed" },
      },
      select: { userId: true, saleCommission: true, financeCommission: true },
    }),
    prisma.sale.groupBy({
      by: ["userId"],
      where: { organizationId: owner.organizationId, ...activeSale, saleDate: { gte: period.first, lte: period.last } },
      _count: { _all: true },
    }),
  ])

  const salaryByUser = new Map<string, number>()
  for (const row of compensations) {
    // newest first, so the first one seen per staff member is the one in force at month end
    if (!salaryByUser.has(row.userId)) salaryByUser.set(row.userId, row.basicSalary)
  }
  const earned = new Map<string, { sale: number; finance: number }>()
  for (const row of commissions) {
    const entry = earned.get(row.userId) ?? { sale: 0, finance: 0 }
    entry.sale += row.saleCommission
    entry.finance += row.financeCommission
    earned.set(row.userId, entry)
  }
  const counts = new Map(salesCounts.map((entry) => [entry.userId, entry._count._all]))

  const rows: PayrollRow[] = users
    .map((user) => {
      const basicSalary = salaryByUser.get(user.id) ?? 0
      const saleCommission = round2(earned.get(user.id)?.sale ?? 0)
      const financeCommission = round2(earned.get(user.id)?.finance ?? 0)
      return {
        userId: user.id,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        salesCount: counts.get(user.id) ?? 0,
        basicSalary,
        saleCommission,
        financeCommission,
        totalPayable: round2(basicSalary + saleCommission + financeCommission),
      }
    })
    // Blocked staff with nothing to pay this month are left out.
    .filter((row) => row.isActive || row.totalPayable > 0 || row.salesCount > 0)

  const sum = (pick: (row: PayrollRow) => number) => round2(rows.reduce((total, row) => total + pick(row), 0))
  return {
    month: period.key,
    monthLabel: period.label,
    rows,
    totals: {
      basicSalary: sum((r) => r.basicSalary),
      saleCommission: sum((r) => r.saleCommission),
      financeCommission: sum((r) => r.financeCommission),
      totalPayable: sum((r) => r.totalPayable),
    },
  }
}
