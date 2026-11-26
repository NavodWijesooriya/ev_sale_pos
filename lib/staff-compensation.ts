import type { Prisma } from "@prisma/client"
import { colomboDayRange, colomboParts } from "@/lib/dates"
import { prisma } from "@/lib/prisma"
import { commissionsFor, toRates, type CompensationRates } from "@/lib/staff-pay"

/**
 * Server side of STAFF pay. Owner-only data: everything that reads it goes through requireOwner.
 * Separate from the dealership's own finance / insurance commission (CommissionSettlement).
 */

type Client = Prisma.TransactionClient | typeof prisma

/** The instant a Colombo calendar day starts, for the day `date` falls on. */
export function colomboDayStart(date: Date): Date {
  const { year, month, day } = colomboParts(date)
  return colomboDayRange(year, month, day).start
}

/** Rates in force on `date`: the latest change that had started by then (none = nothing earned). */
export async function ratesInForce(client: Client, userId: string, date: Date): Promise<CompensationRates | null> {
  const row = await client.staffCompensation.findFirst({
    where: { userId, effectiveFrom: { lte: date } },
    orderBy: { effectiveFrom: "desc" },
  })
  return row ? toRates(row) : null
}

export interface SaleForCommission {
  id: string
  organizationId: string
  userId: string
  saleDate: Date
  paymentType: string | null
  financeAmount: number
  /** The bike's price on the sale (before RMV / insurance charges and discounts). */
  bikePrice: number
}

/**
 * Called inside the sale's transaction. Saves what the seller earns, frozen with the rates used.
 * Does nothing when the seller has no pay settings in force on the sale date.
 */
export async function earnStaffCommission(tx: Prisma.TransactionClient, sale: SaleForCommission) {
  const rates = await ratesInForce(tx, sale.userId, sale.saleDate)
  if (!rates) return null
  const amounts = commissionsFor(rates, sale)
  return tx.staffSaleCommission.create({
    data: {
      organizationId: sale.organizationId,
      userId: sale.userId,
      saleId: sale.id,
      saleDate: sale.saleDate,
      saleCommission: amounts.saleCommission,
      financeCommission: amounts.financeCommission,
      bikePrice: sale.bikePrice,
      financeAmount: sale.paymentType === "FINANCE" ? sale.financeAmount : 0,
      saleCommissionType: rates.saleCommissionType,
      saleCommissionValue: rates.saleCommissionValue,
      financeCommissionType: rates.financeCommissionType,
      financeCommissionValue: rates.financeCommissionValue,
      source: "SALE",
    },
  })
}

/**
 * Cancels the staff commission of a sale that is voided / cancelled / reversed.
 * The app has no sale-void flow yet: call this from inside that flow's transaction when it is added.
 * The payroll figures also ignore commission on any sale whose status is no longer "Completed".
 */
export async function voidStaffCommissionForSale(tx: Prisma.TransactionClient, saleId: string, reason: string) {
  await tx.staffSaleCommission.updateMany({
    where: { saleId, status: "ACTIVE" },
    data: { status: "VOIDED", voidedAt: new Date(), voidReason: reason.slice(0, 200) },
  })
}
