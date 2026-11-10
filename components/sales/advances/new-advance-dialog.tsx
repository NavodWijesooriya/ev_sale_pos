"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import {
  createAdvancePayment,
  updateAdvancePayment,
} from "@/app/actions/advances"
import type {
  AdvancePaymentRecord,
  AdvancePaymentBranchOption,
  AdvancePaymentCustomerOption,
} from "@/app/actions/advances"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  createAdvancePaymentSchema,
  type CreateAdvancePaymentInput,
} from "@/lib/validations/advance-payment"

interface NewAdvanceDialogProps {
  customers: AdvancePaymentCustomerOption[]
  branches: AdvancePaymentBranchOption[]
  advance?: AdvancePaymentRecord
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

function getTodayDate() {
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

export function NewAdvanceDialog({
  customers,
  branches,
  advance,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: NewAdvanceDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [customerSearch, setCustomerSearch] = React.useState("")
  const [customerMenuOpen, setCustomerMenuOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const isEditing = Boolean(advance)
  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }
  const defaultValues = React.useMemo<CreateAdvancePaymentInput>(
    () => ({
      customerId: advance?.customerId ?? "",
      nicNumber: advance?.nicNumber ?? "",
      bikeModel: advance?.bikeModel ?? "",
      amount: advance?.amount ?? 0,
      advanceDate: advance?.advanceDate.slice(0, 10) ?? getTodayDate(),
      branchId: advance?.branchId ?? "",
      paymentDetails: advance?.paymentDetails ?? "",
    }),
    [advance],
  )
  const form = useForm<CreateAdvancePaymentInput>({
    resolver: zodResolver(createAdvancePaymentSchema),
    defaultValues,
  })

  async function onSubmit(values: CreateAdvancePaymentInput) {
    try {
      const result = advance
        ? await updateAdvancePayment(advance.id, values)
        : await createAdvancePayment(values)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(
        isEditing
          ? "Advance payment updated successfully."
          : "Advance payment recorded successfully.",
      )
      if (!isEditing) form.reset({ ...defaultValues, advanceDate: getTodayDate() })
      setCustomerSearch("")
      setCustomerMenuOpen(false)
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Advance payment submission failed:", error)
      toast.error(
        isEditing
          ? "Unable to update the advance payment. Please try again."
          : "Unable to create the advance payment. Please try again.",
      )
    }
  }

  const matchingCustomers = customers.filter((customer) => {
    const search = customerSearch.trim().toLocaleLowerCase()
    return (
      !search ||
      customer.name.toLocaleLowerCase().includes(search) ||
      customer.nic?.toLocaleLowerCase().includes(search)
    )
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!form.formState.isSubmitting) setOpen(nextOpen)
      }}
    >
      {!hideTrigger && (
        <Button type="button" className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Add New Advance
        </Button>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit advance payment" : "New advance payment"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details for this pending advance."
              : "Record a customer advance. New payments are saved with Pending status."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="advance-customer">Customer Name</Label>
              <Controller
                name="customerId"
                control={form.control}
                render={({ field, fieldState }) => {
                  const selectedCustomer = customers.find((customer) => customer.id === field.value)
                  return (
                    <div className="relative">
                      <Input
                        id="advance-customer"
                        role="combobox"
                        autoComplete="off"
                        aria-autocomplete="list"
                        aria-expanded={customerMenuOpen}
                        aria-controls="advance-customer-options"
                        aria-invalid={Boolean(fieldState.error)}
                        placeholder="Search customers by name or NIC"
                        value={customerSearch || selectedCustomer?.name || ""}
                        onFocus={(event) => {
                          setCustomerMenuOpen(true)
                          if (selectedCustomer) event.currentTarget.select()
                        }}
                        onBlur={() => {
                          field.onBlur()
                          setCustomerMenuOpen(false)
                        }}
                        onChange={(event) => {
                          setCustomerSearch(event.target.value)
                          field.onChange("")
                          setCustomerMenuOpen(true)
                        }}
                      />
                      {customerMenuOpen && (
                        <div
                          id="advance-customer-options"
                          role="listbox"
                          aria-label="Existing customers"
                          className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
                        >
                          {matchingCustomers.length > 0 ? (
                            matchingCustomers.map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                role="option"
                                aria-selected={field.value === customer.id}
                                className="flex w-full flex-col rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  field.onChange(customer.id)
                                  form.setValue("nicNumber", customer.nic ?? "", {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  })
                                  setCustomerSearch("")
                                  setCustomerMenuOpen(false)
                                }}
                              >
                                <span className="font-medium">{customer.name}</span>
                                {customer.nic && (
                                  <span className="text-xs text-muted-foreground">{customer.nic}</span>
                                )}
                              </button>
                            ))
                          ) : (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                              No matching customers found.
                            </p>
                          )}
                        </div>
                      )}
                      {fieldState.error && (
                        <p role="alert" className="mt-1 text-xs text-destructive">
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  )
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="advance-nic">NIC Number</Label>
              <Input
                id="advance-nic"
                autoComplete="off"
                aria-invalid={Boolean(form.formState.errors.nicNumber)}
                {...form.register("nicNumber")}
              />
              {form.formState.errors.nicNumber && (
                <p role="alert" className="text-xs text-destructive">
                  {form.formState.errors.nicNumber.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="advance-bike-model">Bike Model</Label>
              <Input
                id="advance-bike-model"
                aria-invalid={Boolean(form.formState.errors.bikeModel)}
                {...form.register("bikeModel")}
              />
              {form.formState.errors.bikeModel && (
                <p role="alert" className="text-xs text-destructive">
                  {form.formState.errors.bikeModel.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="advance-amount">Amount</Label>
              <Input
                id="advance-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                aria-invalid={Boolean(form.formState.errors.amount)}
                {...form.register("amount", { valueAsNumber: true })}
              />
              {form.formState.errors.amount && (
                <p role="alert" className="text-xs text-destructive">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="advance-date">Advance Date</Label>
              <Input
                id="advance-date"
                type="date"
                aria-invalid={Boolean(form.formState.errors.advanceDate)}
                {...form.register("advanceDate")}
              />
              {form.formState.errors.advanceDate && (
                <p role="alert" className="text-xs text-destructive">
                  {form.formState.errors.advanceDate.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="advance-branch">Showroom</Label>
              <Controller
                name="branchId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <>
                    <Select
                      value={field.value || null}
                      onValueChange={(value) => field.onChange(value ?? "")}
                      disabled={branches.length === 0}
                    >
                      <SelectTrigger
                        id="advance-branch"
                        aria-invalid={Boolean(fieldState.error)}
                        className="w-full"
                        onBlur={field.onBlur}
                      >
                        <SelectValue placeholder="Select a showroom" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p role="alert" className="text-xs text-destructive">
                        {fieldState.error.message}
                      </p>
                    )}
                    {branches.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Add a showroom before recording an advance payment.
                      </p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="advance-payment-details">Payment Details</Label>
              <Textarea
                id="advance-payment-details"
                rows={3}
                placeholder="Payment method, receipt number, or other notes"
                aria-invalid={Boolean(form.formState.errors.paymentDetails)}
                {...form.register("paymentDetails")}
              />
              {form.formState.errors.paymentDetails && (
                <p role="alert" className="text-xs text-destructive">
                  {form.formState.errors.paymentDetails.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || branches.length === 0}>
              {form.formState.isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Save Advance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
