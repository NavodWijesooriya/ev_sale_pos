"use server"

/**
 * Additional down payment: when a Delivery Order is LOWER than the sale's finance amount, the customer owes the difference
 * (see lib/do-split.ts). Staff record the customer's payments here. Each payment is added to the sale's down payment, counted
 * in the cash reports on the day it was paid, and audited.
 */

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordAudit } from "@/lib/audit"
import { getAuthSession } from "@/lib/auth"
import { requireAnyPermission } from "@/lib/authorize"
import { colomboDateKey, parseDateKey } from "@/lib/dates"
import { downPaymentBalance } from "@/lib/do-split"
import { EPSILON, round2 } from "@/lib/finance-receivables"
import { branchFilter, hasAnyPermission } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { activeSale } from "@/lib/sale-status"

const money = (n: number) => `Rs. ${new Intl.NumberFormat("en-LK").format(n)}`

const schema = z.object({
  saleId: z.string().trim().min(1),
  amount: z.number().finite().positive("Amount must be above zero."),
  method: z.enum(["Cash", "BankTransfer"]),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date."),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
})
export type AdditionalDownPaymentInput = z.infer<typeof schema>

/** Records a customer's payment of (part of) the additional down payment. */
export async function recordAdditionalDownPayment(input: AdditionalDownPaymentInput): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyPermission("CREATE_SALE", "MANAGE_DOCUMENTS")
    const data = schema.parse(input)
    const day = parseDateKey(data.paymentDate)
    if (!day) throw new Error("Select a valid date.")
    if (data.paymentDate > colomboDateKey(new Date())) throw new Error("A payment cannot be dated in the future.")
    // Noon UTC: the same calendar day in UTC and in Sri Lanka, so cash reports count it on the right day.
    const paymentDate = new Date(Date.UTC(day.year, day.month, day.day, 12))
    const amount = round2(data.amount)

    await prisma.$transaction(async (tx) => {
      // Lock the sale row so two payments cannot both pass the balance check.
      await tx.$queryRaw`SELECT "id" FROM "Sale" WHERE "id" = ${data.saleId} FOR UPDATE`
      const sale = await tx.sale.findFirst({
        where: { id: data.saleId, organizationId: user.organizationId, ...branchFilter(user), ...activeSale },
        select: {
          id: true,
          branchId: true,
          invoiceNumber: true,
          additionalDownPaymentDue: true,
          additionalDownPaymentPaid: true,
          financeDetail: { select: { id: true } },
        },
      })
      if (!sale) throw new Error("Sale not found in your dealership records.")
      const balance = downPaymentBalance(sale.additionalDownPaymentDue, sale.additionalDownPaymentPaid)
      if (balance <= EPSILON) throw new Error("There is no additional down payment due on this sale.")
      if (amount > balance + EPSILON) throw new Error(`The payment is more than the ${money(balance)} still due.`)

      await tx.downPaymentPayment.create({
        data: {
          organizationId: user.organizationId,
          saleId: sale.id,
          amount,
          method: data.method,
          paymentDate,
          reference: data.reference || null,
          receivedById: user.id,
          receivedByName: user.name,
        },
      })
      await tx.sale.update({ where: { id: sale.id }, data: { additionalDownPaymentPaid: round2(sale.additionalDownPaymentPaid + amount) } })
      // The finance record keeps the down payment actually paid (shown in the customer profile).
      if (sale.financeDetail) await tx.financeDetail.update({ where: { id: sale.financeDetail.id }, data: { downPaymentPaid: { increment: amount } } })

      await recordAudit(tx, { id: user.id, name: user.name, organizationId: user.organizationId, branchId: user.branchId }, {
        action: "DOWN_PAYMENT_RECEIVED",
        entityType: "Sale",
        entityId: sale.id,
        branchId: sale.branchId,
        description: `${sale.invoiceNumber}: additional down payment ${money(amount)} (${data.method === "Cash" ? "cash" : "bank transfer"}) received on ${data.paymentDate}; balance now ${money(round2(balance - amount))}`,
      })
    }, { maxWait: 10000, timeout: 30000 })

    for (const path of ["/dashboard", `/dashboard/sales/${data.saleId}`, "/dashboard/sales", "/dashboard/customers", "/dashboard/reports", "/dashboard/finance/receivables", "/dashboard/finance/bank-deposits"]) {
      revalidatePath(path)
    }
    return { success: true, message: "Additional down payment recorded." }
  } catch (error) {
    console.error("recordAdditionalDownPayment error:", error)
    return { success: false, error: error instanceof z.ZodError ? (error.issues[0]?.message ?? "Check the details.") : error instanceof Error ? error.message : "Could not record the payment." }
  }
}

/** Sales where the customer still owes additional down payment (dashboard card), branch-scoped. */
export async function getDownPaymentBalanceSummary(): Promise<{ count: number; total: number }> {
  try {
    const session = await getAuthSession()
    const user = session?.user
    if (!user?.organizationId || !hasAnyPermission(user, ["CREATE_SALE", "MANAGE_DOCUMENTS", "MANAGE_CUSTOMERS", "MANAGE_FINANCE_RECEIVABLES"])) return { count: 0, total: 0 }
    const rows = await prisma.sale.findMany({
      where: { organizationId: user.organizationId, ...branchFilter(user), ...activeSale, additionalDownPaymentDue: { gt: 0 } },
      select: { additionalDownPaymentDue: true, additionalDownPaymentPaid: true },
    })
    const balances = rows.map((r) => downPaymentBalance(r.additionalDownPaymentDue, r.additionalDownPaymentPaid)).filter((b) => b > EPSILON)
    return { count: balances.length, total: round2(balances.reduce((t, b) => t + b, 0)) }
  } catch (error) {
    console.error("getDownPaymentBalanceSummary error:", error)
    return { count: 0, total: 0 }
  }
}
