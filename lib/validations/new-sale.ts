import { z } from "zod"

export const FREE_SALE_ITEMS = [
  "Helmet",
  "Jacket",
  "Carpet",
  "Number Plate Holder",
  "Key Tag",
] as const

export const salePaymentMethods = ["Cash", "Leasing", "Card", "Bank Transfer"] as const

export const salePaymentTypes = ["CASH", "FINANCE"] as const

export const saleWarrantyOptions = [
  "5 Years or 60,000 km (Standard)",
  "8 Years or 80,000 km (Paid Additional Rs. 25,000)",
] as const

export const extendedWarrantyPrice = 25_000

export const commissionBasisOptions = ["FINANCE_AMOUNT", "VEHICLE_PRICE", "FIXED"] as const
export type CommissionBasis = (typeof commissionBasisOptions)[number]

export const insuranceTypeOptions = ["NONE", "FULL_DEALER", "CUSTOMER_OWN"] as const
export type InsuranceTypeOption = (typeof insuranceTypeOptions)[number]

/** Dealer insurance commission, in LKR, for a Full Insurance policy sold on a cash sale. */
export const FULL_INSURANCE_COMMISSION = 2_000

/**
 * Insurance commission rule (single source of truth for UI and server):
 * - only Full Insurance issued through the dealership earns commission
 * - finance sales earn none, customer's own insurance earns none
 */
export function insuranceCommissionFor(insuranceType: InsuranceTypeOption, isFinance: boolean): number {
  return insuranceType === "FULL_DEALER" && !isFinance ? FULL_INSURANCE_COMMISSION : 0
}

export const createNewSaleSchema = z.object({
  customerId: z.string().trim().min(1, "Select a customer."),
  vehicleId: z.string().trim().min(1, "Select a vehicle."),
  paymentType: z.enum(salePaymentTypes),
  paymentMethod: z.enum(salePaymentMethods, { error: "Select a payment method." }),
  warrantyOption: z.enum(saleWarrantyOptions, { error: "Select a warranty option." }),
  freeItems: z.array(z.enum(FREE_SALE_ITEMS)).max(FREE_SALE_ITEMS.length),
  freeServices: z.number().int().min(0),
  advancePaymentId: z.string().trim().optional().or(z.literal("")),
  financeCompanyId: z.string().trim().optional().or(z.literal("")),
  financeAmount: z.number().min(0).optional().nullable(),
  downPayment: z.number().min(0).optional().nullable(),
  commissionBasis: z.enum(commissionBasisOptions),
  commissionRate: z.number().min(0).optional().nullable(),
  commissionAmount: z.number().min(0).optional().nullable(),
  insuranceType: z.enum(insuranceTypeOptions),
  insuranceCompanyId: z.string().trim().optional().or(z.literal("")),
  financeCommission: z.number().min(0).optional().nullable(),
  insuranceCommission: z.number().min(0).optional().nullable(),
  commissionRecipientId: z.string().trim().optional().or(z.literal("")),
})

export type CreateNewSaleInput = z.infer<typeof createNewSaleSchema>
