import { z } from "zod"

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, "Select a valid date.")

const amount = z.number().finite().positive("Amount must be greater than zero.")

export const allocationSchema = z.object({
  grnId: z.string().trim().min(1),
  amount,
})

export const setGrnPayableSchema = z.object({
  grnId: z.string().trim().min(1),
  supplierId: z.string().trim().min(1, "Select a supplier."),
  totalAmount: z.number().finite().min(0, "Total cannot be negative."),
})
export type SetGrnPayableInput = z.infer<typeof setGrnPayableSchema>

export const chequeDetailsSchema = z.object({
  chequeNumber: z.string().trim().min(1, "Enter the cheque number.").max(40),
  bankName: z.string().trim().min(1, "Enter the bank name.").max(120),
  chequeDate: dateString,
})

export const recordSupplierPaymentSchema = z
  .object({
    supplierId: z.string().trim().min(1, "Select a supplier."),
    method: z.enum(["Cash", "BankTransfer", "CHEQUE"]),
    amount,
    paymentDate: dateString,
    referenceNo: z.string().trim().max(120).optional().or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    /** Split of this payment across GRNs. Any unallocated remainder becomes a supplier advance. */
    allocations: z.array(allocationSchema).max(200),
    cheque: chequeDetailsSchema.optional(),
  })
  .refine((v) => v.method !== "CHEQUE" || !!v.cheque, {
    message: "Cheque details are required for cheque payments.",
    path: ["cheque"],
  })

export type RecordSupplierPaymentInput = z.infer<typeof recordSupplierPaymentSchema>

export const allocateAdvanceSchema = z.object({
  supplierId: z.string().trim().min(1),
  allocations: z.array(allocationSchema).min(1, "Select at least one GRN.").max(200),
})
export type AllocateAdvanceInput = z.infer<typeof allocateAdvanceSchema>

export const clearChequeSchema = z.object({
  chequeId: z.string().trim().min(1),
  clearedDate: dateString.optional(),
})

export const bounceChequeSchema = z.object({
  chequeId: z.string().trim().min(1),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
})
