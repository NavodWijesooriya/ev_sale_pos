"use server"

import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordAudit } from "@/lib/audit"
import { requireAnyPermission, requireOwner } from "@/lib/authorize"
import { colomboDateKey, colomboDayRange, parseDateKey } from "@/lib/dates"
import { branchFilter } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

type Db = Prisma.TransactionClient | typeof prisma

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const requireDepositUser = () => requireAnyPermission("MANAGE_BANK_DEPOSITS")

/** A calendar date "YYYY-MM-DD" stored as UTC midnight of that date (no timezone drift). */
function dateOnly(key: string): Date {
  const parts = parseDateKey(key)
  if (!parts) throw new Error("Enter a valid date.")
  return new Date(Date.UTC(parts.year, parts.month, parts.day))
}

/**
 * Cash taken at a branch on a Colombo calendar day: invoiced amount of sales paid in cash
 * (already net of any customer advance), minus cash refunded to customers that day because a sale was cancelled.
 * A cancelled sale still counts on the day it was made, because the cash really was taken then; its refund is what
 * takes the cash back out, on the day it was paid. Shown as a reference next to the deposit, not enforced.
 */
async function cashSalesFor(db: Db, organizationId: string, branchId: string, dateKey: string) {
  const day = parseDateKey(dateKey)
  if (!day) return 0
  const { start, end } = colomboDayRange(day.year, day.month, day.day)
  const [total, refunds, topUps] = await Promise.all([
    db.sale.aggregate({
      where: { organizationId, branchId, paymentMethod: "Cash", saleDate: { gte: start, lte: end } },
      _sum: { totalAmount: true },
    }),
    db.sale.aggregate({
      where: { organizationId, branchId, cancelRefundMethod: "Cash", cancelledAt: { gte: start, lte: end } },
      _sum: { cancelRefundAmount: true },
    }),
    // Customers' additional down payments paid in cash that day (after a lower Delivery Order).
    db.downPaymentPayment.aggregate({
      where: { organizationId, method: "Cash", paymentDate: { gte: start, lte: end }, sale: { branchId } },
      _sum: { amount: true },
    }),
  ])
  return round2((total._sum.totalAmount ?? 0) + (topUps._sum.amount ?? 0) - (refunds._sum.cancelRefundAmount ?? 0))
}

export interface DepositOptions {
  branches: { id: string; name: string }[]
  accounts: { id: string; bankName: string; accountNumber: string; accountName: string | null; isActive: boolean }[]
}

export async function getBankDepositOptions(): Promise<DepositOptions> {
  const user = await requireDepositUser()
  const own = branchFilter(user).branchId
  const [branches, accounts] = await Promise.all([
    prisma.branch.findMany({
      where: { organizationId: user.organizationId, ...(own ? { id: own } : {}) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.bankAccount.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, bankName: true, accountNumber: true, accountName: true, isActive: true },
      orderBy: [{ isActive: "desc" }, { bankName: "asc" }],
    }),
  ])
  return { branches, accounts }
}

/** Reference figures for the form: that day's cash sales for the branch and what is already deposited. */
export async function getDepositReference(branchId: string, dateKey: string) {
  const user = await requireDepositUser()
  const own = branchFilter(user).branchId
  if (own && branchId !== own) throw new Error("You can only work with your own branch.")
  const [cashSalesTotal, deposited] = await Promise.all([
    cashSalesFor(prisma, user.organizationId, branchId, dateKey),
    prisma.bankDeposit.aggregate({
      where: { organizationId: user.organizationId, branchId, depositDate: dateOnly(dateKey) },
      _sum: { depositAmount: true },
    }),
  ])
  const alreadyDeposited = round2(deposited._sum.depositAmount ?? 0)
  return { cashSalesTotal, alreadyDeposited, remaining: round2(cashSalesTotal - alreadyDeposited) }
}

const depositSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date."),
  branchId: z.string().trim().min(1, "Select a branch."),
  bankAccountId: z.string().trim().min(1, "Select a bank account."),
  amount: z.number().finite().positive("Deposit amount must be above zero.").max(1_000_000_000),
  slipNumber: z.string().trim().min(1, "Enter the slip / reference number.").max(60),
  description: z.string().trim().max(500).optional().or(z.literal("")),
})
export type RecordDepositInput = z.infer<typeof depositSchema>

export async function recordBankDeposit(input: RecordDepositInput) {
  try {
    const user = await requireDepositUser()
    const data = depositSchema.parse(input)
    const actor = { id: user.id, name: user.name, organizationId: user.organizationId, branchId: user.branchId }

    const depositDate = dateOnly(data.date)
    if (data.date > colomboDateKey(new Date())) throw new Error("A deposit cannot be dated in the future.")
    const amount = round2(data.amount)

    const result = await prisma.$transaction(async (tx) => {
      // A branch-assigned user may only deposit for their own branch. Reject anything else outright:
      // never quietly switch to their branch.
      const own = branchFilter(user).branchId
      if (own && data.branchId !== own) throw new Error("You can only record deposits for your own branch.")
      const branch = await tx.branch.findFirst({
        where: { id: data.branchId, organizationId: user.organizationId },
        select: { id: true, name: true },
      })
      if (!branch) throw new Error("Branch not found.")

      const account = await tx.bankAccount.findFirst({
        where: { id: data.bankAccountId, organizationId: user.organizationId, isActive: true },
        select: { id: true, bankName: true, accountNumber: true },
      })
      if (!account) throw new Error("Bank account not found or inactive.")

      const duplicate = await tx.bankDeposit.findFirst({
        where: { organizationId: user.organizationId, bankAccountId: account.id, slipNumber: data.slipNumber },
        select: { id: true },
      })
      if (duplicate) throw new Error("This slip number was already recorded for that bank account.")

      const cashSalesTotal = await cashSalesFor(tx, user.organizationId, branch.id, data.date)
      const before = await tx.bankDeposit.aggregate({
        where: { organizationId: user.organizationId, branchId: branch.id, depositDate },
        _sum: { depositAmount: true },
      })
      const alreadyDeposited = round2(before._sum.depositAmount ?? 0)

      const deposit = await tx.bankDeposit.create({
        data: {
          organizationId: user.organizationId,
          branchId: branch.id,
          bankAccountId: account.id,
          depositDate,
          cashSalesTotal,
          depositAmount: amount,
          slipNumber: data.slipNumber,
          description: data.description || null,
          createdById: user.id,
          createdByName: user.name,
        },
      })

      await recordAudit(tx, actor, {
        action: "BANK_DEPOSIT_RECORDED",
        entityType: "BankDeposit",
        entityId: deposit.id,
        branchId: branch.id,
        description: `${branch.name} ${data.date}: deposited ${amount.toFixed(2)} to ${account.bankName} ${account.accountNumber}, slip ${data.slipNumber} (cash sales that day ${cashSalesTotal.toFixed(2)})`,
      })

      return { cashSalesTotal, totalDeposited: round2(alreadyDeposited + amount) }
    })

    revalidatePath("/dashboard/finance/bank-deposits")
    const over = result.totalDeposited > result.cashSalesTotal + 0.005
    return {
      success: true as const,
      message: over
        ? `Deposit recorded. Note: deposits for this day (${result.totalDeposited.toFixed(2)}) exceed that day's cash sales (${result.cashSalesTotal.toFixed(2)}).`
        : "Deposit recorded.",
    }
  } catch (error) {
    console.error("recordBankDeposit error:", error)
    return { success: false as const, message: fail(error, "Could not record the deposit.") }
  }
}

const accountSchema = z.object({
  bankName: z.string().trim().min(2, "Enter the bank name.").max(80),
  accountNumber: z.string().trim().min(3, "Enter the account number.").max(40),
  accountName: z.string().trim().max(80).optional().or(z.literal("")),
})

export async function saveBankAccount(input: z.infer<typeof accountSchema>) {
  try {
    const user = await requireDepositUser()
    const data = accountSchema.parse(input)
    const actor = { id: user.id, name: user.name, organizationId: user.organizationId, branchId: user.branchId }

    await prisma.$transaction(async (tx) => {
      const exists = await tx.bankAccount.findFirst({
        where: { organizationId: user.organizationId, accountNumber: data.accountNumber },
        select: { id: true },
      })
      if (exists) throw new Error("A bank account with this number already exists.")
      const account = await tx.bankAccount.create({
        data: {
          organizationId: user.organizationId,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          accountName: data.accountName || null,
        },
      })
      await recordAudit(tx, actor, {
        action: "BANK_ACCOUNT_SAVED",
        entityType: "BankAccount",
        entityId: account.id,
        description: `Added bank account ${data.bankName} ${data.accountNumber}`,
      })
    })
    revalidatePath("/dashboard/finance/bank-deposits")
    return { success: true as const, message: "Bank account added." }
  } catch (error) {
    return { success: false as const, message: fail(error, "Could not save the bank account.") }
  }
}

/** Owner only: removes a mistaken deposit entry (logged in the audit trail). */
export async function deleteBankDeposit(depositId: string) {
  try {
    const owner = await requireOwner()
    const actor = { id: owner.id, name: owner.name, organizationId: owner.organizationId, branchId: owner.branchId }
    await prisma.$transaction(async (tx) => {
      const deposit = await tx.bankDeposit.findFirst({
        where: { id: depositId, organizationId: owner.organizationId },
        include: { bankAccount: { select: { bankName: true, accountNumber: true } }, branch: { select: { name: true } } },
      })
      if (!deposit) throw new Error("Deposit not found.")
      await tx.bankDeposit.delete({ where: { id: deposit.id } })
      await recordAudit(tx, actor, {
        action: "BANK_DEPOSIT_DELETED",
        entityType: "BankDeposit",
        entityId: deposit.id,
        branchId: deposit.branchId,
        description: `Deleted deposit ${deposit.depositAmount.toFixed(2)} (${deposit.branch.name} ${deposit.depositDate.toISOString().slice(0, 10)}, ${deposit.bankAccount.bankName} ${deposit.bankAccount.accountNumber}, slip ${deposit.slipNumber})`,
      })
    })
    revalidatePath("/dashboard/finance/bank-deposits")
    return { success: true as const, message: "Deposit deleted." }
  } catch (error) {
    return { success: false as const, message: fail(error, "Could not delete the deposit.") }
  }
}

export interface DepositReportFilters {
  from?: string
  to?: string
  branchId?: string
  bankAccountId?: string
  /** matches slip number or description */
  search?: string
}

export interface DepositReportRow {
  id: string
  depositDate: string
  branchName: string
  bankName: string
  accountNumber: string
  cashSalesTotal: number
  depositAmount: number
  slipNumber: string
  description: string | null
  recordedBy: string
}

/** Filterable deposit report. Branch-assigned staff only see their own branch. */
export async function getBankDepositReport(filters: DepositReportFilters = {}) {
  const user = await requireDepositUser()
  const from = parseDateKey(filters.from)
  const to = parseDateKey(filters.to)
  const search = filters.search?.trim()

  const rows = await prisma.bankDeposit.findMany({
    where: {
      organizationId: user.organizationId,
      ...branchFilter(user),
      ...(filters.branchId && !branchFilter(user).branchId ? { branchId: filters.branchId } : {}),
      ...(filters.bankAccountId ? { bankAccountId: filters.bankAccountId } : {}),
      ...(from || to
        ? {
            depositDate: {
              ...(from ? { gte: new Date(Date.UTC(from.year, from.month, from.day)) } : {}),
              ...(to ? { lte: new Date(Date.UTC(to.year, to.month, to.day)) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { slipNumber: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      branch: { select: { name: true } },
      bankAccount: { select: { bankName: true, accountNumber: true } },
    },
    orderBy: [{ depositDate: "desc" }, { createdAt: "desc" }],
    take: 1000,
  })

  const mapped: DepositReportRow[] = rows.map((r) => ({
    id: r.id,
    depositDate: r.depositDate.toISOString().slice(0, 10),
    branchName: r.branch.name,
    bankName: r.bankAccount.bankName,
    accountNumber: r.bankAccount.accountNumber,
    cashSalesTotal: r.cashSalesTotal,
    depositAmount: r.depositAmount,
    slipNumber: r.slipNumber,
    description: r.description,
    recordedBy: r.createdByName,
  }))
  return {
    rows: mapped,
    totalDeposited: round2(mapped.reduce((sum, r) => sum + r.depositAmount, 0)),
  }
}

function fail(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? fallback
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "That slip number or account already exists."
  }
  return error instanceof Error ? error.message : fallback
}
