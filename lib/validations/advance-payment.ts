import { z } from "zod"

export const createAdvancePaymentSchema = z.object({
  customerId: z.string().trim().min(1, "Select a customer."),
  nicNumber: z.string().trim().min(1, "Enter the customer's NIC number."),
  bikeModel: z.string().trim().min(1, "Enter the bike model.").max(120),
  amount: z.number().finite().positive("Amount must be greater than zero."),
  advanceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid advance date.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`)
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    }, "Select a valid advance date."),
  branchId: z.string().trim().min(1, "Select a showroom."),
  paymentDetails: z.string().trim().max(1000, "Payment details must be 1,000 characters or fewer."),
})

export type CreateAdvancePaymentInput = z.infer<typeof createAdvancePaymentSchema>

export const refundAdvancePaymentSchema = z.object({
  paymentMethod: z.enum(["Cash", "Card", "BankTransfer", "CHEQUE"]),
})

export type RefundAdvancePaymentInput = z.infer<typeof refundAdvancePaymentSchema>

export const transferAdvancePaymentSchema = z.object({
  targetCustomerId: z.string().trim().min(1, "Select a customer."),
  targetVehicleId: z.string().trim().min(1, "Select an available vehicle."),
})

export type TransferAdvancePaymentInput = z.infer<typeof transferAdvancePaymentSchema>
