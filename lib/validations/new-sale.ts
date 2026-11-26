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

/** Default dealer insurance commission (LKR) for Full Insurance on a cash sale; the owner can change it in settings. */
export const FULL_INSURANCE_COMMISSION = 2_000

/**
 * Insurance commission rule (single source of truth for UI and server):
 * - only Full Insurance issued through the dealership earns commission
 * - finance sales earn none, customer's own insurance earns none
 */
export function insuranceCommissionFor(
  insuranceType: InsuranceTypeOption,
  isFinance: boolean,
  fullInsuranceAmount: number = FULL_INSURANCE_COMMISSION,
): number {
  return insuranceType === "FULL_DEALER" && !isFinance ? fullInsuranceAmount : 0
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
  // Ticked = add the owner-configured third-party insurance amount (the server decides the amount).
  thirdPartyInsurance: z.boolean().optional(),
})

export type CreateNewSaleInput = z.infer<typeof createNewSaleSchema>

/** Defaults for the customer-paid sale charges; the owner can change them under Settings > Sale Charges. */
export const DEFAULT_RMV_CHARGE_FINANCE = 14_300
export const DEFAULT_RMV_CHARGE_CASH = 10_300
export const DEFAULT_THIRD_PARTY_INSURANCE = 1_200

export interface SaleChargeSettings {
  rmvChargeFinance: number
  rmvChargeCash: number
  thirdPartyInsurance: number
}

/** RMV charge for a payment type. Finance sales and cash sales have different amounts. */
export function rmvChargeFor(settings: SaleChargeSettings, isFinance: boolean): number {
  return isFinance ? settings.rmvChargeFinance : settings.rmvChargeCash
}
