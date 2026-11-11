import { z } from "zod"

export const FREE_SALE_ITEMS = [
  "Helmet",
  "Jacket",
  "Carpet",
  "Number Plate Holder",
  "Key Tag",
] as const

export const salePaymentMethods = ["Cash", "Leasing", "Card", "Bank Transfer"] as const

export const saleWarrantyOptions = [
  "5 Years or 60,000 km (Standard)",
  "8 Years or 80,000 km (Paid Additional Rs. 25,000)",
] as const

export const extendedWarrantyPrice = 25_000

export const createNewSaleSchema = z.object({
  customerId: z.string().trim().min(1, "Select a customer."),
  vehicleId: z.string().trim().min(1, "Select a vehicle."),
  paymentMethod: z.enum(salePaymentMethods, { error: "Select a payment method." }),
  warrantyOption: z.enum(saleWarrantyOptions, { error: "Select a warranty option." }),
  freeItems: z.array(z.enum(FREE_SALE_ITEMS)).max(FREE_SALE_ITEMS.length),
  freeServices: z.number().int().min(0),
  advancePaymentId: z.string().trim().optional().or(z.literal("")),
  financeCompanyId: z.string().trim().optional().or(z.literal("")),
  insuranceCompanyId: z.string().trim().optional().or(z.literal("")),
  financeCommission: z.number().min(0).optional().nullable(),
  insuranceCommission: z.number().min(0).optional().nullable(),
})

export type CreateNewSaleInput = z.infer<typeof createNewSaleSchema>
