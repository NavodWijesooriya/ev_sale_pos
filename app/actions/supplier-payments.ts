"use server"

import {
  ChequeStatus,
  GrnPaymentStatus,
  PaymentMethod,
  Prisma,
  SupplierPaymentStatus,
} from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  allocateAdvanceSchema,
  bounceChequeSchema,
  clearChequeSchema,
  recordSupplierPaymentSchema,
  setGrnPayableSchema,
  type AllocateAdvanceInput,
  type RecordSupplierPaymentInput,
  type SetGrnPayableInput,
} from "@/lib/validations/supplier-payment"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EPSILON = 0.005
const PAYMENT_NUMBER_LOCK = 874230602

type Tx = Prisma.TransactionClient
type ActionResult<T = object> = ({ success: true; message: string } & T) | { success: false; message: string }

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

async function requireOrganizationUser() {
  const session = await getAuthSession()
  const organizationId = session?.user?.organizationId
  const userId = session?.user?.id
  if (!organizationId || !userId) {
    throw new Error("Unauthorized. Please log in to your dealership portal.")
  }
  return { organizationId, userId }
}

function failure(label: string, error: unknown): { success: false; message: string } {
  console.error(`${label} error:`, error)
  return { success: false, message: error instanceof Error ? error.message : "Something went wrong." }
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function deriveStatus(total: number, paid: number): GrnPaymentStatus {
  if (paid <= EPSILON) return GrnPaymentStatus.UNPAID
  if (paid >= total - EPSILON) return GrnPaymentStatus.PAID
  return GrnPaymentStatus.PARTIAL
}

/** Applies a signed delta to a GRN's paid amount and re-derives balance/status. */
async function applyToGrn(tx: Tx, grnId: string, organizationId: string, delta: number) {
  const grn = await tx.gRN.findFirst({
    where: { id: grnId, organizationId },
    select: { id: true, grnNumber: true, totalAmount: true, paidAmount: true },
  })
  if (!grn) throw new Error("GRN not found.")

  const paid = round2(grn.paidAmount + delta)
  if (paid < -EPSILON) throw new Error(`Payment reversal exceeds the paid amount on ${grn.grnNumber}.`)
  if (paid > grn.totalAmount + EPSILON) {
    throw new Error(
      `Allocation exceeds the outstanding balance on ${grn.grnNumber} (balance ${round2(grn.totalAmount - grn.paidAmount).toFixed(2)}).`,
    )
  }

  const clamped = Math.max(0, paid)
  await tx.gRN.update({
    where: { id: grn.id },
    data: {
      paidAmount: clamped,
      balanceAmount: round2(grn.totalAmount - clamped),
      paymentStatus: deriveStatus(grn.totalAmount, clamped),
    },
  })
}

function assertUniqueAllocations(allocations: { grnId: string; amount: number }[]) {
  if (new Set(allocations.map((a) => a.grnId)).size !== allocations.length) {
    throw new Error("Each GRN can appear only once per allocation.")
  }
}

async function assertSupplier(tx: Tx, supplierId: string, organizationId: string) {
  const supplier = await tx.supplier.findFirst({ where: { id: supplierId, organizationId }, select: { id: true } })
  if (!supplier) throw new Error("Supplier not found.")
}

async function assertGrnsBelongToSupplier(tx: Tx, grnIds: string[], supplierId: string, organizationId: string) {
  const count = await tx.gRN.count({ where: { id: { in: grnIds }, supplierId, organizationId } })
  if (count !== grnIds.length) throw new Error("One or more GRNs do not belong to this supplier.")
}

async function nextPaymentNumber(tx: Tx, organizationId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${PAYMENT_NUMBER_LOCK})`
  const count = await tx.supplierPayment.count({ where: { organizationId } })
  return `SP-${String(count + 1).padStart(5, "0")}`
}

function revalidateSupplierPages() {
  revalidatePath("/dashboard/suppliers")
  revalidatePath("/dashboard/suppliers/payments")
  revalidatePath("/dashboard/suppliers/cheques")
  revalidatePath("/dashboard/suppliers/reports")
  revalidatePath("/dashboard/grn/report")
}

// ---------------------------------------------------------------------------
// GRN payable setup
// ---------------------------------------------------------------------------

/**
 * GRNs are currently created with totalAmount 0 and no supplier. This assigns
 * the supplier and the amount owed so the GRN can be paid against.
 */
export async function setGrnPayable(input: SetGrnPayableInput): Promise<ActionResult> {
  try {
    const { organizationId } = await requireOrganizationUser()
    const data = setGrnPayableSchema.parse(input)

    await prisma.$transaction(async (tx) => {
      await assertSupplier(tx, data.supplierId, organizationId)
      const grn = await tx.gRN.findFirst({
        where: { id: data.grnId, organizationId },
        select: { id: true, supplierId: true, paidAmount: true },
      })
      if (!grn) throw new Error("GRN not found.")
      if (grn.supplierId && grn.supplierId !== data.supplierId && grn.paidAmount > EPSILON) {
        throw new Error("Cannot change the supplier of a GRN that already has payments.")
      }
      const total = round2(data.totalAmount)
      if (total < grn.paidAmount - EPSILON) {
        throw new Error("Total cannot be lower than the amount already paid.")
      }
      await tx.gRN.update({
        where: { id: grn.id },
        data: {
          supplierId: data.supplierId,
          totalAmount: total,
          balanceAmount: round2(total - grn.paidAmount),
          paymentStatus: deriveStatus(total, grn.paidAmount),
        },
      })
    })

    revalidateSupplierPages()
    return { success: true, message: "GRN payable updated." }
  } catch (error) {
    return failure("setGrnPayable", error)
  }
}

// ---------------------------------------------------------------------------
// Record payment (Cash / Bank transfer / Cheque) with multi-GRN allocation
// ---------------------------------------------------------------------------

export async function recordSupplierPayment(
  input: RecordSupplierPaymentInput,
): Promise<ActionResult<{ paymentId: string; paymentNumber: string; advanceAmount: number }>> {
  try {
    const { organizationId, userId } = await requireOrganizationUser()
    const data = recordSupplierPaymentSchema.parse(input)
    const amount = round2(data.amount)
    const allocations = data.allocations.map((a) => ({ grnId: a.grnId, amount: round2(a.amount) }))
    assertUniqueAllocations(allocations)

    const allocated = round2(allocations.reduce((sum, a) => sum + a.amount, 0))
    if (allocated > amount + EPSILON) throw new Error("Allocated amount exceeds the payment amount.")
    const advanceAmount = round2(amount - allocated)

    const result = await prisma.$transaction(async (tx) => {
      await assertSupplier(tx, data.supplierId, organizationId)
      if (allocations.length) {
        await assertGrnsBelongToSupplier(tx, allocations.map((a) => a.grnId), data.supplierId, organizationId)
      }

      const paymentNumber = await nextPaymentNumber(tx, organizationId)
      const isCheque = data.method === "CHEQUE"
      const payment = await tx.supplierPayment.create({
        data: {
          organizationId,
          supplierId: data.supplierId,
          paymentNumber,
          amount,
          method: data.method as PaymentMethod,
          status: isCheque ? SupplierPaymentStatus.PENDING : SupplierPaymentStatus.COMPLETED,
          paymentDate: parseDate(data.paymentDate),
          referenceNo: data.referenceNo || null,
          notes: data.notes || null,
          createdById: userId,
        },
      })

      // A cheque reduces the GRN balance when issued; a bounce reverses it.
      for (const a of allocations) {
        await applyToGrn(tx, a.grnId, organizationId, a.amount)
        await tx.supplierPaymentAllocation.create({
          data: { paymentId: payment.id, grnId: a.grnId, amount: a.amount },
        })
      }

      if (isCheque && data.cheque) {
        await tx.cheque.create({
          data: {
            organizationId,
            supplierId: data.supplierId,
            paymentId: payment.id,
            chequeNumber: data.cheque.chequeNumber,
            bankName: data.cheque.bankName,
            chequeDate: parseDate(data.cheque.chequeDate),
            amount,
            status: ChequeStatus.ISSUED,
            events: { create: { fromStatus: null, toStatus: ChequeStatus.ISSUED, note: "Cheque issued", userId } },
          },
        })
      }

      if (advanceAmount > EPSILON) {
        await tx.supplierAdvance.create({
          data: {
            organizationId,
            supplierId: data.supplierId,
            paymentId: payment.id,
            amount: advanceAmount,
            balanceAmount: advanceAmount,
            date: parseDate(data.paymentDate),
            notes: `Unallocated balance of ${paymentNumber}`,
          },
        })
      }

      return { paymentId: payment.id, paymentNumber }
    })

    revalidateSupplierPages()
    return {
      success: true,
      message:
        advanceAmount > EPSILON
          ? `Payment ${result.paymentNumber} recorded. ${advanceAmount.toFixed(2)} kept as supplier advance.`
          : `Payment ${result.paymentNumber} recorded.`,
      ...result,
      advanceAmount,
    }
  } catch (error) {
    return failure("recordSupplierPayment", error)
  }
}

// ---------------------------------------------------------------------------
// Supplier advances
// ---------------------------------------------------------------------------

/** Records a pure advance (no GRN allocation) — shortcut over recordSupplierPayment. */
export async function recordSupplierAdvance(
  input: Omit<RecordSupplierPaymentInput, "allocations">,
) {
  return recordSupplierPayment({ ...input, allocations: [] })
}

/** Applies the supplier's advance balance (oldest first) to the chosen GRNs. */
export async function allocateAdvanceToGrns(input: AllocateAdvanceInput): Promise<ActionResult> {
  try {
    const { organizationId } = await requireOrganizationUser()
    const data = allocateAdvanceSchema.parse(input)
    const allocations = data.allocations.map((a) => ({ grnId: a.grnId, amount: round2(a.amount) }))
    assertUniqueAllocations(allocations)

    await prisma.$transaction(async (tx) => {
      await assertSupplier(tx, data.supplierId, organizationId)
      await assertGrnsBelongToSupplier(tx, allocations.map((a) => a.grnId), data.supplierId, organizationId)

      // Advances funded by a bounced cheque have balance 0, so only live ones remain.
      const advances = await tx.supplierAdvance.findMany({
        where: { organizationId, supplierId: data.supplierId, balanceAmount: { gt: EPSILON } },
        orderBy: { date: "asc" },
      })
      const available = round2(advances.reduce((s, a) => s + a.balanceAmount, 0))
      const needed = round2(allocations.reduce((s, a) => s + a.amount, 0))
      if (needed > available + EPSILON) {
        throw new Error(`Advance balance (${available.toFixed(2)}) is lower than the requested ${needed.toFixed(2)}.`)
      }

      for (const a of allocations) {
        await applyToGrn(tx, a.grnId, organizationId, a.amount)

        let remaining = a.amount
        for (const advance of advances) {
          if (remaining <= EPSILON) break
          if (advance.balanceAmount <= EPSILON) continue
          const take = round2(Math.min(remaining, advance.balanceAmount))
          advance.balanceAmount = round2(advance.balanceAmount - take)
          advance.usedAmount = round2(advance.usedAmount + take)
          remaining = round2(remaining - take)
          await tx.supplierAdvanceAllocation.create({ data: { advanceId: advance.id, grnId: a.grnId, amount: take } })
          await tx.supplierAdvance.update({
            where: { id: advance.id },
            data: { balanceAmount: advance.balanceAmount, usedAmount: advance.usedAmount },
          })
        }
      }
    })

    revalidateSupplierPages()
    return { success: true, message: "Advance applied to the selected GRNs." }
  } catch (error) {
    return failure("allocateAdvanceToGrns", error)
  }
}

// ---------------------------------------------------------------------------
// Cheque lifecycle
//
//   ISSUED ──> PRESENTED ──> CLEARED
//      │           │
//      ├───────────┴──> BOUNCED   (payment reversed)
//      └──────────────> CANCELLED (payment reversed)
//
// PENDING is a legacy alias of ISSUED. CLEARED / BOUNCED / CANCELLED are final.
// Every transition is written to ChequeEvent for audit.
// ---------------------------------------------------------------------------

const ACTIVE_CHEQUE_STATUSES: ChequeStatus[] = [ChequeStatus.PENDING, ChequeStatus.ISSUED, ChequeStatus.PRESENTED]

const ALLOWED_FROM: Record<"PRESENTED" | "CLEARED" | "BOUNCED" | "CANCELLED", ChequeStatus[]> = {
  PRESENTED: [ChequeStatus.PENDING, ChequeStatus.ISSUED],
  CLEARED: ACTIVE_CHEQUE_STATUSES,
  BOUNCED: ACTIVE_CHEQUE_STATUSES,
  CANCELLED: [ChequeStatus.PENDING, ChequeStatus.ISSUED],
}

/** Rolls back every GRN allocation (and any advance) funded by a payment. Runs inside a transaction. */
async function reversePayment(tx: Tx, paymentId: string, organizationId: string, reason: string) {
  const allocations = await tx.supplierPaymentAllocation.findMany({ where: { paymentId } })
  for (const a of allocations) {
    await applyToGrn(tx, a.grnId, organizationId, -a.amount)
  }

  // Void advances funded by this payment, undoing any GRN allocations made from them
  const advances = await tx.supplierAdvance.findMany({ where: { paymentId }, include: { allocations: true } })
  for (const advance of advances) {
    for (const a of advance.allocations) {
      await applyToGrn(tx, a.grnId, organizationId, -a.amount)
    }
    await tx.supplierAdvanceAllocation.deleteMany({ where: { advanceId: advance.id } })
    await tx.supplierAdvance.update({
      where: { id: advance.id },
      data: { usedAmount: 0, balanceAmount: 0, notes: `${advance.notes ?? ""} [Voided: ${reason}]`.trim() },
    })
  }

  await tx.supplierPayment.update({
    where: { id: paymentId },
    data: { status: SupplierPaymentStatus.REVERSED, reversedAt: new Date() },
  })
}

/**
 * Moves a cheque to a new status exactly once. The status-guarded updateMany makes
 * double clicks and concurrent requests fail instead of repeating side effects
 * (in particular, a payment can only be reversed one time).
 */
async function transitionCheque(
  chequeId: string,
  to: "PRESENTED" | "CLEARED" | "BOUNCED" | "CANCELLED",
  opts: { note?: string; clearedAt?: Date } = {},
) {
  const { organizationId, userId } = await requireOrganizationUser()

  await prisma.$transaction(async (tx) => {
    const current = await tx.cheque.findFirst({
      where: { id: chequeId, organizationId },
      select: { status: true, paymentId: true },
    })
    if (!current) throw new Error("Cheque not found.")

    const now = new Date()
    const updated = await tx.cheque.updateMany({
      where: { id: chequeId, organizationId, status: current.status, AND: { status: { in: ALLOWED_FROM[to] } } },
      data: {
        status: ChequeStatus[to],
        ...(to === "CLEARED" ? { clearedAt: opts.clearedAt ?? now } : {}),
        ...(to === "BOUNCED" ? { bouncedAt: now, bounceReason: opts.note || null } : {}),
      },
    })
    if (updated.count !== 1) {
      throw new Error(`A ${current.status.toLowerCase()} cheque cannot be marked as ${to.toLowerCase()}.`)
    }

    await tx.chequeEvent.create({
      data: { chequeId, fromStatus: current.status, toStatus: ChequeStatus[to], note: opts.note || null, userId },
    })

    if (to === "CLEARED") {
      await tx.supplierPayment.update({
        where: { id: current.paymentId },
        data: { status: SupplierPaymentStatus.COMPLETED },
      })
    } else if (to === "BOUNCED" || to === "CANCELLED") {
      await reversePayment(tx, current.paymentId, organizationId, `cheque ${to.toLowerCase()}`)
    }
  })

  revalidateSupplierPages()
}

export async function markChequePresented(input: { chequeId: string }): Promise<ActionResult> {
  try {
    await transitionCheque(input.chequeId, "PRESENTED")
    return { success: true, message: "Cheque marked as presented to the bank." }
  } catch (error) {
    return failure("markChequePresented", error)
  }
}

export async function clearCheque(input: { chequeId: string; clearedDate?: string }): Promise<ActionResult> {
  try {
    const data = clearChequeSchema.parse(input)
    await transitionCheque(data.chequeId, "CLEARED", {
      clearedAt: data.clearedDate ? parseDate(data.clearedDate) : undefined,
    })
    return { success: true, message: "Cheque marked as cleared." }
  } catch (error) {
    return failure("clearCheque", error)
  }
}

/** Bounce: the payment is reversed automatically (allocations rolled back, advances voided). */
export async function bounceCheque(input: { chequeId: string; reason?: string }): Promise<ActionResult> {
  try {
    const data = bounceChequeSchema.parse(input)
    await transitionCheque(data.chequeId, "BOUNCED", { note: data.reason })
    return { success: true, message: "Cheque marked as bounced and the payment was reversed." }
  } catch (error) {
    return failure("bounceCheque", error)
  }
}

/** Cancel a cheque that was issued but never presented; the payment is reversed too. */
export async function cancelCheque(input: { chequeId: string; reason?: string }): Promise<ActionResult> {
  try {
    const data = bounceChequeSchema.parse(input)
    await transitionCheque(data.chequeId, "CANCELLED", { note: data.reason })
    return { success: true, message: "Cheque cancelled and the payment was reversed." }
  } catch (error) {
    return failure("cancelCheque", error)
  }
}

export async function getChequeHistory(chequeId: string) {
  const { organizationId } = await requireOrganizationUser()
  const events = await prisma.chequeEvent.findMany({
    where: { chequeId, cheque: { organizationId } },
    orderBy: { createdAt: "asc" },
  })
  return events.map((e) => ({
    id: e.id,
    fromStatus: e.fromStatus,
    toStatus: e.toStatus,
    note: e.note,
    createdAt: e.createdAt.toISOString(),
  }))
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export interface SupplierGrnRow {
  id: string
  grnNumber: string
  date: string
  supplierId: string | null
  supplierName: string | null
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  paymentStatus: GrnPaymentStatus
}

export interface SupplierPaymentsOverview {
  suppliers: { id: string; name: string; outstanding: number; advanceBalance: number }[]
  grns: SupplierGrnRow[]
}

/** Suppliers + GRNs for the Supplier Payments page. */
export async function getSupplierPaymentsOverview(filter?: {
  supplierId?: string
  status?: GrnPaymentStatus
}): Promise<SupplierPaymentsOverview> {
  const { organizationId } = await requireOrganizationUser()

  const [suppliers, grns, advances] = await Promise.all([
    prisma.supplier.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.gRN.findMany({
      where: {
        organizationId,
        ...(filter?.supplierId ? { supplierId: filter.supplierId } : {}),
        ...(filter?.status ? { paymentStatus: filter.status } : {}),
      },
      select: {
        id: true,
        grnNumber: true,
        date: true,
        supplierId: true,
        supplier: { select: { name: true } },
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        paymentStatus: true,
      },
      orderBy: { date: "desc" },
    }),
    prisma.supplierAdvance.groupBy({
      by: ["supplierId"],
      where: { organizationId },
      _sum: { balanceAmount: true },
    }),
  ])

  const advanceBySupplier = new Map(advances.map((a) => [a.supplierId, a._sum.balanceAmount ?? 0]))
  const outstandingBySupplier = new Map<string, number>()
  for (const g of grns) {
    if (g.supplierId) outstandingBySupplier.set(g.supplierId, (outstandingBySupplier.get(g.supplierId) ?? 0) + g.balanceAmount)
  }

  return {
    suppliers: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      outstanding: round2(outstandingBySupplier.get(s.id) ?? 0),
      advanceBalance: round2(advanceBySupplier.get(s.id) ?? 0),
    })),
    grns: grns.map((g) => ({
      id: g.id,
      grnNumber: g.grnNumber,
      date: g.date.toISOString(),
      supplierId: g.supplierId,
      supplierName: g.supplier?.name ?? null,
      totalAmount: g.totalAmount,
      paidAmount: g.paidAmount,
      balanceAmount: g.balanceAmount,
      paymentStatus: g.paymentStatus,
    })),
  }
}

/** Unpaid/partial GRNs and advance balance for one supplier — feeds the "Make Payment" modal. */
export async function getSupplierPayableDetails(supplierId: string) {
  const { organizationId } = await requireOrganizationUser()
  const [grns, advance] = await Promise.all([
    prisma.gRN.findMany({
      where: { organizationId, supplierId, paymentStatus: { not: GrnPaymentStatus.PAID }, balanceAmount: { gt: EPSILON } },
      select: { id: true, grnNumber: true, date: true, totalAmount: true, paidAmount: true, balanceAmount: true },
      orderBy: { date: "asc" },
    }),
    prisma.supplierAdvance.aggregate({
      where: { organizationId, supplierId },
      _sum: { balanceAmount: true },
    }),
  ])
  return {
    grns: grns.map((g) => ({ ...g, date: g.date.toISOString() })),
    advanceBalance: round2(advance._sum.balanceAmount ?? 0),
  }
}

export interface ChequeRow {
  id: string
  chequeNumber: string
  bankName: string
  amount: number
  chequeDate: string
  status: ChequeStatus
  clearedAt: string | null
  bouncedAt: string | null
  bounceReason: string | null
  supplierId: string
  supplierName: string
  paymentNumber: string
}

export async function getCheques(filter?: { status?: ChequeStatus; supplierId?: string }): Promise<ChequeRow[]> {
  const { organizationId } = await requireOrganizationUser()
  const cheques = await prisma.cheque.findMany({
    where: {
      organizationId,
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.supplierId ? { supplierId: filter.supplierId } : {}),
    },
    include: { supplier: { select: { name: true } }, payment: { select: { paymentNumber: true } } },
    orderBy: { chequeDate: "asc" },
  })
  return cheques.map((c) => ({
    id: c.id,
    chequeNumber: c.chequeNumber,
    bankName: c.bankName,
    amount: c.amount,
    chequeDate: c.chequeDate.toISOString(),
    status: c.status,
    clearedAt: c.clearedAt?.toISOString() ?? null,
    bouncedAt: c.bouncedAt?.toISOString() ?? null,
    bounceReason: c.bounceReason,
    supplierId: c.supplierId,
    supplierName: c.supplier.name,
    paymentNumber: c.payment.paymentNumber,
  }))
}

export interface LedgerEntry {
  date: string
  type: "GRN" | "PAYMENT" | "REVERSED_PAYMENT"
  reference: string
  description: string
  debit: number // increases amount owed
  credit: number // decreases amount owed
  balance: number // running amount owed (negative = in credit / advance)
}

/** Chronological supplier account: GRN totals as debits, non-reversed payments as credits. */
export async function getSupplierLedger(supplierId: string) {
  const { organizationId } = await requireOrganizationUser()
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, organizationId }, select: { id: true, name: true } })
  if (!supplier) throw new Error("Supplier not found.")

  const [grns, payments, advance] = await Promise.all([
    prisma.gRN.findMany({
      where: { organizationId, supplierId, totalAmount: { gt: 0 } },
      select: { grnNumber: true, date: true, totalAmount: true },
    }),
    prisma.supplierPayment.findMany({
      where: { organizationId, supplierId },
      include: { cheque: { select: { chequeNumber: true, status: true } } },
    }),
    prisma.supplierAdvance.aggregate({ where: { organizationId, supplierId }, _sum: { balanceAmount: true } }),
  ])

  const raw: Omit<LedgerEntry, "balance">[] = [
    ...grns.map((g) => ({
      date: g.date.toISOString(),
      type: "GRN" as const,
      reference: g.grnNumber,
      description: "Goods received",
      debit: g.totalAmount,
      credit: 0,
    })),
    ...payments.map((p) => ({
      date: p.paymentDate.toISOString(),
      type: p.status === SupplierPaymentStatus.REVERSED ? ("REVERSED_PAYMENT" as const) : ("PAYMENT" as const),
      reference: p.paymentNumber,
      description:
        p.method === PaymentMethod.CHEQUE
          ? `Cheque ${p.cheque?.chequeNumber ?? ""} (${p.cheque?.status ?? ""})`.trim()
          : p.method === PaymentMethod.BankTransfer
            ? `Bank transfer${p.referenceNo ? ` ${p.referenceNo}` : ""}`
            : "Cash payment",
      debit: 0,
      // reversed payments are listed for audit but do not reduce the balance
      credit: p.status === SupplierPaymentStatus.REVERSED ? 0 : p.amount,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  let running = 0
  const entries: LedgerEntry[] = raw.map((e) => {
    running = round2(running + e.debit - e.credit)
    return { ...e, balance: running }
  })

  return {
    supplier,
    entries,
    closingBalance: running,
    advanceBalance: round2(advance._sum.balanceAmount ?? 0),
  }
}

export interface SupplierOutstandingRow {
  supplierId: string
  supplierName: string
  totalPurchases: number
  totalPaid: number
  outstanding: number
  advanceBalance: number
  pendingCheques: number
  unpaidGrns: number
}

/** Outstanding report across all suppliers. */
export async function getSupplierOutstandingReport(): Promise<SupplierOutstandingRow[]> {
  const { organizationId } = await requireOrganizationUser()
  const [suppliers, grnSums, advances, pendingCheques] = await Promise.all([
    prisma.supplier.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.gRN.groupBy({
      by: ["supplierId"],
      where: { organizationId, supplierId: { not: null } },
      _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
    }),
    prisma.supplierAdvance.groupBy({ by: ["supplierId"], where: { organizationId }, _sum: { balanceAmount: true } }),
    prisma.cheque.groupBy({
      by: ["supplierId"],
      where: { organizationId, status: { in: ACTIVE_CHEQUE_STATUSES } },
      _sum: { amount: true },
    }),
  ])
  const unpaidCounts = await prisma.gRN.groupBy({
    by: ["supplierId"],
    where: { organizationId, supplierId: { not: null }, paymentStatus: { not: GrnPaymentStatus.PAID }, totalAmount: { gt: 0 } },
    _count: { _all: true },
  })

  const byId = <T extends { supplierId: string | null }>(rows: T[]) => new Map(rows.map((r) => [r.supplierId, r]))
  const g = byId(grnSums), a = byId(advances), c = byId(pendingCheques), u = byId(unpaidCounts)

  return suppliers.map((s) => ({
    supplierId: s.id,
    supplierName: s.name,
    totalPurchases: round2(g.get(s.id)?._sum.totalAmount ?? 0),
    totalPaid: round2(g.get(s.id)?._sum.paidAmount ?? 0),
    outstanding: round2(g.get(s.id)?._sum.balanceAmount ?? 0),
    advanceBalance: round2(a.get(s.id)?._sum.balanceAmount ?? 0),
    pendingCheques: round2(c.get(s.id)?._sum.amount ?? 0),
    unpaidGrns: u.get(s.id)?._count._all ?? 0,
  }))
}

/** Payment history for a supplier (or all), newest first, with GRN allocation breakdown. */
export async function getSupplierPaymentHistory(supplierId?: string) {
  const { organizationId } = await requireOrganizationUser()
  const payments = await prisma.supplierPayment.findMany({
    where: { organizationId, ...(supplierId ? { supplierId } : {}) },
    include: {
      supplier: { select: { name: true } },
      cheque: { select: { chequeNumber: true, bankName: true, status: true } },
      allocations: { select: { amount: true, grn: { select: { grnNumber: true } } } },
    },
    orderBy: { paymentDate: "desc" },
    take: 500,
  })
  return payments.map((p) => ({
    id: p.id,
    paymentNumber: p.paymentNumber,
    supplierName: p.supplier.name,
    amount: p.amount,
    method: p.method,
    status: p.status,
    paymentDate: p.paymentDate.toISOString(),
    referenceNo: p.referenceNo,
    cheque: p.cheque,
    allocations: p.allocations.map((a) => ({ grnNumber: a.grn.grnNumber, amount: a.amount })),
  }))
}
