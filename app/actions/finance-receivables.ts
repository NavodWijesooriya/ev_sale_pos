"use server"

import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordAudit, type AuditAction } from "@/lib/audit"
import { requireAnyPermission } from "@/lib/authorize"
import { colomboDateKey, parseDateKey } from "@/lib/dates"
import {
  AGING_BUCKETS,
  EPSILON,
  INCOMING_CHEQUE_ALLOWED_FROM,
  ageInDays,
  agingBucket,
  deriveFinanceStatus,
  round2,
  type AgingBucket,
  type IncomingChequeStatusKey,
} from "@/lib/finance-receivables"
import { branchFilter } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

// Money a finance (leasing) company still owes the dealership, and the payments it makes.
// Mirrors app/actions/supplier-payments.ts (allocation, row locks, exactly-once reversal, audit),
// except that a CHEQUE receipt only RESERVES its allocations and applies them when the cheque clears.
// Commission is separate (see commission-settlement.ts) and never part of a receivable.

type Tx = Prisma.TransactionClient

const PERMISSION = "MANAGE_FINANCE_RECEIVABLES" as const

async function requireReceivablesUser() {
  const user = await requireAnyPermission(PERMISSION)
  const actor = { id: user.id, name: user.name, organizationId: user.organizationId, branchId: user.branchId }
  return { user, organizationId: user.organizationId, actor }
}

function failure(error: unknown, fallback: string): { success: false; message: string } {
  console.error("finance-receivables error:", error)
  if (error instanceof z.ZodError) return { success: false, message: error.issues[0]?.message ?? fallback }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { success: false, message: "That receipt number was just taken. Please try again." }
  }
  return { success: false, message: error instanceof Error ? error.message : fallback }
}

function revalidateReceivablePages() {
  for (const path of ["/dashboard/finance/receivables", "/dashboard/sales", "/dashboard/customers", "/dashboard"]) {
    revalidatePath(path)
  }
}

/** Locks the given FinanceDetail rows (in id order, so concurrent receipts cannot deadlock). */
async function lockDetails(tx: Tx, ids: string[]) {
  if (ids.length === 0) return
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "FinanceDetail" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`,
  )
}

/** Amount already promised by pending cheque receipts (reserved, but not applied to the balance yet). */
async function reservedByDetail(tx: Tx | typeof prisma, ids: string[]) {
  if (ids.length === 0) return new Map<string, number>()
  const rows = await tx.financeReceiptAllocation.groupBy({
    by: ["financeDetailId"],
    where: { financeDetailId: { in: ids }, receipt: { status: "PENDING" } },
    _sum: { amount: true },
  })
  return new Map(rows.map((r) => [r.financeDetailId, round2(r._sum.amount ?? 0)]))
}

/** Adds (+) or removes (-) received money on a finance detail and re-derives balance, status and date. */
async function applyToDetail(tx: Tx, financeDetailId: string, delta: number) {
  const detail = await tx.financeDetail.findUnique({
    where: { id: financeDetailId },
    select: { id: true, totalFinanceAmount: true, receivedAmount: true, sale: { select: { invoiceNumber: true } } },
  })
  if (!detail) throw new Error("Finance record not found.")

  const received = round2(detail.receivedAmount + delta)
  if (received < -EPSILON) throw new Error(`Reversal exceeds the amount received on ${detail.sale.invoiceNumber}.`)
  if (received > detail.totalFinanceAmount + EPSILON) {
    throw new Error(
      `Payment exceeds the balance on ${detail.sale.invoiceNumber} (balance ${round2(detail.totalFinanceAmount - detail.receivedAmount).toFixed(2)}).`,
    )
  }

  const clamped = Math.max(0, received)
  const status = deriveFinanceStatus(detail.totalFinanceAmount, clamped)
  await tx.financeDetail.update({
    where: { id: detail.id },
    data: {
      receivedAmount: clamped,
      balanceAmount: Math.max(0, round2(detail.totalFinanceAmount - clamped)),
      status,
      receivedAt: status === "Received" ? new Date() : null,
    },
  })
}

async function nextReceiptNumber(tx: Tx, organizationId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(874230604, hashtext(${organizationId}))`
  const count = await tx.financeReceipt.count({ where: { organizationId } })
  return `FR-${String(count + 1).padStart(5, "0")}`
}

// ---------------------------------------------------------------------------
// Reading receivables
// ---------------------------------------------------------------------------

export interface ReceivableItem {
  financeDetailId: string
  saleId: string
  invoiceNumber: string
  saleDate: string
  customerName: string
  branchName: string
  totalFinanceAmount: number
  receivedAmount: number
  balanceAmount: number
  /** Promised by cheques that have not cleared yet. */
  reservedAmount: number
  /** What can still be allocated to a new receipt. */
  availableAmount: number
  status: "Pending" | "Partial" | "Received"
  expectedDate: string | null
  overdue: boolean
  ageDays: number
  bucket: AgingBucket
}

export interface ReceivableGroup {
  financeCompanyId: string | null
  financeCompanyName: string
  outstanding: number
  reserved: number
  available: number
  count: number
  buckets: Record<AgingBucket, number>
  items: ReceivableItem[]
}

export interface PendingReceivablesFilters {
  financeCompanyId?: string
  branchId?: string
  aging?: string
}

export async function getPendingFinanceReceivables(filters: PendingReceivablesFilters = {}) {
  const { user, organizationId } = await requireReceivablesUser()
  const restricted = branchFilter(user).branchId
  const bucketFilter = AGING_BUCKETS.find((b) => b === filters.aging)
  const now = new Date()

  const [details, companies, branches] = await Promise.all([
    prisma.financeDetail.findMany({
      where: {
        sale: {
          organizationId,
          ...branchFilter(user),
          ...(filters.branchId && !restricted ? { branchId: filters.branchId } : {}),
        },
        balanceAmount: { gt: EPSILON },
        ...(filters.financeCompanyId ? { financeCompanyId: filters.financeCompanyId } : {}),
      },
      include: {
        company: { select: { id: true, name: true } },
        sale: {
          select: {
            id: true,
            invoiceNumber: true,
            saleDate: true,
            customer: { select: { name: true } },
            branch: { select: { name: true } },
          },
        },
      },
      orderBy: { sale: { saleDate: "asc" } },
    }),
    prisma.financeCompany.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({
      where: { organizationId, ...(restricted ? { id: restricted } : {}) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  const reserved = await reservedByDetail(prisma, details.map((d) => d.id))
  const groups = new Map<string, ReceivableGroup>()
  const bucketTotals: Record<AgingBucket, number> = { "0-29": 0, "30-59": 0, "60-89": 0, "90+": 0 }

  for (const d of details) {
    const ageDays = ageInDays(d.sale.saleDate, now)
    const bucket = agingBucket(ageDays)
    if (bucketFilter && bucket !== bucketFilter) continue

    const reservedAmount = reserved.get(d.id) ?? 0
    const item: ReceivableItem = {
      financeDetailId: d.id,
      saleId: d.sale.id,
      invoiceNumber: d.sale.invoiceNumber,
      saleDate: d.sale.saleDate.toISOString(),
      customerName: d.sale.customer.name,
      branchName: d.sale.branch.name,
      totalFinanceAmount: d.totalFinanceAmount,
      receivedAmount: d.receivedAmount,
      balanceAmount: d.balanceAmount,
      reservedAmount,
      availableAmount: Math.max(0, round2(d.balanceAmount - reservedAmount)),
      status: d.status,
      expectedDate: d.expectedDate?.toISOString() ?? null,
      overdue: d.expectedDate ? d.expectedDate.getTime() < now.getTime() : false,
      ageDays,
      bucket,
    }

    const key = d.financeCompanyId ?? "none"
    const group =
      groups.get(key) ??
      ({
        financeCompanyId: d.financeCompanyId,
        financeCompanyName: d.company?.name ?? d.financeCompany,
        outstanding: 0,
        reserved: 0,
        available: 0,
        count: 0,
        buckets: { "0-29": 0, "30-59": 0, "60-89": 0, "90+": 0 },
        items: [],
      } satisfies ReceivableGroup)
    group.outstanding = round2(group.outstanding + item.balanceAmount)
    group.reserved = round2(group.reserved + item.reservedAmount)
    group.available = round2(group.available + item.availableAmount)
    group.count += 1
    group.buckets[bucket] = round2(group.buckets[bucket] + item.balanceAmount)
    group.items.push(item)
    groups.set(key, group)
    bucketTotals[bucket] = round2(bucketTotals[bucket] + item.balanceAmount)
  }

  const list = Array.from(groups.values()).sort((a, b) => b.outstanding - a.outstanding)
  return {
    groups: list,
    companies,
    branches,
    totals: {
      outstanding: round2(list.reduce((t, g) => t + g.outstanding, 0)),
      reserved: round2(list.reduce((t, g) => t + g.reserved, 0)),
      available: round2(list.reduce((t, g) => t + g.available, 0)),
      count: list.reduce((t, g) => t + g.count, 0),
      buckets: bucketTotals,
    },
  }
}

/** Sales of one company that can still receive money, oldest first: feeds the receive dialog. */
export async function getCompanyAllocatableSales(financeCompanyId: string) {
  const { user, organizationId } = await requireReceivablesUser()
  const details = await prisma.financeDetail.findMany({
    where: { financeCompanyId, balanceAmount: { gt: EPSILON }, sale: { organizationId, ...branchFilter(user) } },
    select: {
      id: true,
      balanceAmount: true,
      totalFinanceAmount: true,
      sale: { select: { invoiceNumber: true, saleDate: true, customer: { select: { name: true } } } },
    },
    orderBy: { sale: { saleDate: "asc" } },
  })
  const reserved = await reservedByDetail(prisma, details.map((d) => d.id))
  return details
    .map((d) => ({
      financeDetailId: d.id,
      invoiceNumber: d.sale.invoiceNumber,
      saleDate: d.sale.saleDate.toISOString(),
      customerName: d.sale.customer.name,
      totalFinanceAmount: d.totalFinanceAmount,
      balanceAmount: d.balanceAmount,
      availableAmount: Math.max(0, round2(d.balanceAmount - (reserved.get(d.id) ?? 0))),
    }))
    .filter((d) => d.availableAmount > EPSILON)
}

// ---------------------------------------------------------------------------
// Recording a receipt
// ---------------------------------------------------------------------------

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date.")
  .refine((v) => parseDateKey(v) !== null, "Select a valid date.")

const receiptSchema = z
  .object({
    financeCompanyId: z.string().trim().min(1, "Select the finance company."),
    method: z.enum(["BankTransfer", "CHEQUE", "Cash"]),
    amount: z.number().finite().positive("Amount must be above zero."),
    receiptDate: dateString,
    referenceNo: z.string().trim().max(120).optional().or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    allocations: z
      .array(
        z.object({
          financeDetailId: z.string().trim().min(1),
          amount: z.number().finite().positive("Each allocation must be above zero."),
        }),
      )
      .min(1, "Allocate the payment to at least one sale.")
      .max(200),
    cheque: z
      .object({
        chequeNumber: z.string().trim().min(1, "Enter the cheque number.").max(40),
        bankName: z.string().trim().min(1, "Enter the bank name.").max(120),
        chequeDate: dateString,
      })
      .optional(),
  })
  .refine((v) => v.method !== "CHEQUE" || !!v.cheque, { message: "Cheque details are required.", path: ["cheque"] })

export type RecordFinanceReceiptInput = z.infer<typeof receiptSchema>

export async function recordFinanceReceipt(input: RecordFinanceReceiptInput) {
  try {
    const { user, organizationId, actor } = await requireReceivablesUser()
    const data = receiptSchema.parse(input)
    const amount = round2(data.amount)
    const allocations = data.allocations.map((a) => ({ financeDetailId: a.financeDetailId, amount: round2(a.amount) }))

    if (new Set(allocations.map((a) => a.financeDetailId)).size !== allocations.length) {
      throw new Error("Each sale can appear only once per payment.")
    }
    const allocated = round2(allocations.reduce((t, a) => t + a.amount, 0))
    if (Math.abs(allocated - amount) > EPSILON) {
      throw new Error(
        `The allocations (${allocated.toFixed(2)}) must add up to the payment amount (${amount.toFixed(2)}).`,
      )
    }
    if (data.receiptDate > colomboDateKey(new Date())) throw new Error("A payment cannot be dated in the future.")
    const receiptDay = parseDateKey(data.receiptDate)!
    const receiptDate = new Date(Date.UTC(receiptDay.year, receiptDay.month, receiptDay.day))
    const isCheque = data.method === "CHEQUE"

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.financeCompany.findFirst({
        where: { id: data.financeCompanyId, organizationId },
        select: { id: true, name: true },
      })
      if (!company) throw new Error("Finance company not found.")

      // Serialise against other receipts touching the same sales, then check each one.
      const ids = allocations.map((a) => a.financeDetailId)
      await lockDetails(tx, ids)
      const details = await tx.financeDetail.findMany({
        where: {
          id: { in: ids },
          financeCompanyId: company.id,
          sale: { organizationId, ...branchFilter(user) },
        },
        select: { id: true, balanceAmount: true, sale: { select: { invoiceNumber: true } } },
      })
      if (details.length !== ids.length) {
        throw new Error("One or more sales do not belong to this finance company (or are not yours to receive for).")
      }
      const reserved = await reservedByDetail(tx, ids)
      for (const a of allocations) {
        const d = details.find((x) => x.id === a.financeDetailId)!
        const available = round2(d.balanceAmount - (reserved.get(d.id) ?? 0))
        if (a.amount > available + EPSILON) {
          throw new Error(
            `Allocation exceeds what is still receivable on ${d.sale.invoiceNumber} (available ${Math.max(0, available).toFixed(2)}).`,
          )
        }
      }

      const receiptNumber = await nextReceiptNumber(tx, organizationId)
      const receipt = await tx.financeReceipt.create({
        data: {
          organizationId,
          branchId: user.branchId ?? null,
          financeCompanyId: company.id,
          receiptNumber,
          amount,
          method: data.method,
          status: isCheque ? "PENDING" : "COMPLETED",
          receiptDate,
          referenceNo: data.referenceNo || null,
          notes: data.notes || null,
          createdById: user.id,
          createdByName: user.name,
          appliedAt: isCheque ? null : new Date(),
          allocations: { create: allocations.map((a) => ({ financeDetailId: a.financeDetailId, amount: a.amount })) },
        },
      })

      if (isCheque && data.cheque) {
        const chequeDay = parseDateKey(data.cheque.chequeDate)!
        await tx.incomingCheque.create({
          data: {
            organizationId,
            financeCompanyId: company.id,
            receiptId: receipt.id,
            chequeNumber: data.cheque.chequeNumber,
            bankName: data.cheque.bankName,
            amount,
            chequeDate: new Date(Date.UTC(chequeDay.year, chequeDay.month, chequeDay.day)),
            events: { create: { fromStatus: null, toStatus: "RECEIVED", note: "Cheque received", userId: user.id } },
          },
        })
      } else {
        // Bank transfer / cash: the money is in, so it reduces the balances right away.
        for (const a of allocations) await applyToDetail(tx, a.financeDetailId, a.amount)
      }

      await recordAudit(tx, actor, {
        action: "FINANCE_RECEIPT_RECORDED",
        entityType: "FinanceReceipt",
        entityId: receipt.id,
        description: `${receiptNumber}: ${data.method} ${amount.toFixed(2)} from ${company.name}, ${allocations.length} sale(s)${
          isCheque ? ` (cheque ${data.cheque?.chequeNumber}, applied when it clears)` : ""
        }`,
      })
      return { receiptId: receipt.id, receiptNumber }
    })

    revalidateReceivablePages()
    return {
      success: true as const,
      message: isCheque
        ? `Receipt ${result.receiptNumber} recorded. The balances change when the cheque clears.`
        : `Receipt ${result.receiptNumber} recorded.`,
      ...result,
    }
  } catch (error) {
    return failure(error, "Could not record the payment.")
  }
}

// ---------------------------------------------------------------------------
// Incoming cheque lifecycle
// ---------------------------------------------------------------------------

async function transitionIncomingCheque(
  chequeId: string,
  to: "PRESENTED" | "CLEARED" | "BOUNCED",
  note?: string,
) {
  const { user, organizationId, actor } = await requireReceivablesUser()

  await prisma.$transaction(async (tx) => {
    const cheque = await tx.incomingCheque.findFirst({
      where: { id: chequeId, organizationId },
      include: {
        receipt: {
          select: { id: true, receiptNumber: true, branchId: true, status: true, appliedAt: true, allocations: true },
        },
      },
    })
    if (!cheque) throw new Error("Cheque not found.")
    const restricted = branchFilter(user).branchId
    if (restricted && cheque.receipt.branchId !== restricted) throw new Error("Cheque not found.")

    // The allocations' sales are locked first, so clearing or reversing cannot interleave with a new receipt.
    await lockDetails(tx, cheque.receipt.allocations.map((a) => a.financeDetailId))

    const now = new Date()
    // Status-guarded update: a double click or a concurrent request fails instead of repeating the effect.
    const moved = await tx.incomingCheque.updateMany({
      where: { id: chequeId, organizationId, status: { in: INCOMING_CHEQUE_ALLOWED_FROM[to] as IncomingChequeStatusKey[] } },
      data: {
        status: to,
        ...(to === "PRESENTED" ? { presentedAt: now } : {}),
        ...(to === "CLEARED" ? { clearedAt: now } : {}),
        ...(to === "BOUNCED" ? { bouncedAt: now, bounceReason: note || null } : {}),
      },
    })
    if (moved.count !== 1) {
      throw new Error(`A ${cheque.status.toLowerCase()} cheque cannot be marked as ${to.toLowerCase()}.`)
    }

    await tx.incomingChequeEvent.create({
      data: { chequeId, fromStatus: cheque.status, toStatus: to, note: note || null, userId: user.id },
    })

    if (to === "CLEARED") {
      // The cheque is cash now: apply the reserved allocations to the balances.
      for (const a of cheque.receipt.allocations) await applyToDetail(tx, a.financeDetailId, a.amount)
      await tx.financeReceipt.update({ where: { id: cheque.receipt.id }, data: { status: "COMPLETED", appliedAt: now } })
    } else if (to === "BOUNCED") {
      // Before clearing nothing was applied, so releasing the reservation is enough.
      // After clearing (a returned cheque) the applied money is taken back, exactly once.
      if (cheque.status === "CLEARED") {
        for (const a of cheque.receipt.allocations) await applyToDetail(tx, a.financeDetailId, -a.amount)
      }
      await tx.financeReceipt.update({ where: { id: cheque.receipt.id }, data: { status: "REVERSED", reversedAt: now } })
    }

    const auditAction = `FINANCE_CHEQUE_${to}` as AuditAction
    await recordAudit(tx, actor, {
      action: auditAction,
      entityType: "IncomingCheque",
      entityId: chequeId,
      branchId: cheque.receipt.branchId,
      description: `${cheque.receipt.receiptNumber} cheque ${cheque.chequeNumber}: ${cheque.status} -> ${to}${
        to === "BOUNCED" && cheque.status === "CLEARED" ? " (applied payment reversed)" : ""
      }${note ? `: ${note}` : ""}`,
    })
  })

  revalidateReceivablePages()
}

export async function presentFinanceCheque(input: { chequeId: string }) {
  try {
    await transitionIncomingCheque(input.chequeId, "PRESENTED")
    return { success: true as const, message: "Cheque marked as presented to the bank." }
  } catch (error) {
    return failure(error, "Could not update the cheque.")
  }
}

export async function clearFinanceCheque(input: { chequeId: string }) {
  try {
    await transitionIncomingCheque(input.chequeId, "CLEARED")
    return { success: true as const, message: "Cheque cleared. The balances were updated." }
  } catch (error) {
    return failure(error, "Could not update the cheque.")
  }
}

export async function bounceFinanceCheque(input: { chequeId: string; reason?: string }) {
  try {
    await transitionIncomingCheque(input.chequeId, "BOUNCED", input.reason?.trim().slice(0, 500) || undefined)
    return { success: true as const, message: "Cheque marked as bounced." }
  } catch (error) {
    return failure(error, "Could not update the cheque.")
  }
}

/**
 * Voids a bank-transfer or cash receipt entered by mistake: the allocations are taken back and the
 * balances and statuses restored, exactly once. (A cheque receipt is reversed by bouncing its cheque.)
 */
export async function reverseFinanceReceipt(input: { receiptId: string; reason?: string }) {
  try {
    const { user, organizationId, actor } = await requireReceivablesUser()
    const reason = input.reason?.trim().slice(0, 500) || undefined

    await prisma.$transaction(async (tx) => {
      const receipt = await tx.financeReceipt.findFirst({
        where: { id: input.receiptId, organizationId },
        include: { allocations: true },
      })
      if (!receipt) throw new Error("Receipt not found.")
      const restricted = branchFilter(user).branchId
      if (restricted && receipt.branchId !== restricted) throw new Error("Receipt not found.")
      if (receipt.method === "CHEQUE") throw new Error("A cheque receipt is reversed by bouncing its cheque.")

      await lockDetails(tx, receipt.allocations.map((a) => a.financeDetailId))
      const moved = await tx.financeReceipt.updateMany({
        where: { id: receipt.id, organizationId, status: "COMPLETED" },
        data: { status: "REVERSED", reversedAt: new Date() },
      })
      if (moved.count !== 1) throw new Error(`A ${receipt.status.toLowerCase()} receipt cannot be reversed.`)

      for (const a of receipt.allocations) await applyToDetail(tx, a.financeDetailId, -a.amount)

      await recordAudit(tx, actor, {
        action: "FINANCE_RECEIPT_REVERSED",
        entityType: "FinanceReceipt",
        entityId: receipt.id,
        branchId: receipt.branchId,
        description: `${receipt.receiptNumber}: reversed ${receipt.amount.toFixed(2)}${reason ? `: ${reason}` : ""}`,
      })
    })

    revalidateReceivablePages()
    return { success: true as const, message: "Receipt reversed. The balances were restored." }
  } catch (error) {
    return failure(error, "Could not reverse the receipt.")
  }
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export interface ReceiptRow {
  id: string
  receiptNumber: string
  receiptDate: string
  financeCompanyName: string
  method: string
  status: string
  amount: number
  referenceNo: string | null
  recordedBy: string
  invoices: string[]
  cheque: null | {
    id: string
    chequeNumber: string
    bankName: string
    chequeDate: string
    status: IncomingChequeStatusKey
  }
}

export async function getFinanceReceipts(filters: { financeCompanyId?: string; status?: string } = {}): Promise<ReceiptRow[]> {
  const { user, organizationId } = await requireReceivablesUser()
  const restricted = branchFilter(user).branchId
  const status = ["COMPLETED", "PENDING", "REVERSED"].find((s) => s === filters.status)
  const rows = await prisma.financeReceipt.findMany({
    where: {
      organizationId,
      ...(restricted ? { branchId: restricted } : {}),
      ...(filters.financeCompanyId ? { financeCompanyId: filters.financeCompanyId } : {}),
      ...(status ? { status: status as "COMPLETED" | "PENDING" | "REVERSED" } : {}),
    },
    include: {
      financeCompany: { select: { name: true } },
      allocations: { select: { financeDetail: { select: { sale: { select: { invoiceNumber: true } } } } } },
      incomingCheque: true,
    },
    orderBy: [{ receiptDate: "desc" }, { createdAt: "desc" }],
    take: 500,
  })
  return rows.map((r) => ({
    id: r.id,
    receiptNumber: r.receiptNumber,
    receiptDate: r.receiptDate.toISOString().slice(0, 10),
    financeCompanyName: r.financeCompany.name,
    method: r.method,
    status: r.status,
    amount: r.amount,
    referenceNo: r.referenceNo,
    recordedBy: r.createdByName,
    invoices: r.allocations.map((a) => a.financeDetail.sale.invoiceNumber),
    cheque: r.incomingCheque
      ? {
          id: r.incomingCheque.id,
          chequeNumber: r.incomingCheque.chequeNumber,
          bankName: r.incomingCheque.bankName,
          chequeDate: r.incomingCheque.chequeDate.toISOString().slice(0, 10),
          status: r.incomingCheque.status,
        }
      : null,
  }))
}
