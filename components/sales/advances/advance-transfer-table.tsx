"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRightLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import {
  transferAdvancePayment,
  type AdvanceTransferCustomerOption,
  type AdvanceTransferVehicleOption,
  type PendingAdvanceTransferRecord,
} from "@/app/actions/advances"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatLKR } from "@/lib/currency"
import {
  transferAdvancePaymentSchema,
  type TransferAdvancePaymentInput,
} from "@/lib/validations/advance-payment"

interface AdvanceTransferTableProps {
  advances: PendingAdvanceTransferRecord[]
  customers: AdvanceTransferCustomerOption[]
  vehicles: AdvanceTransferVehicleOption[]
}

function TransferAdvanceDialog({
  advance,
  customers,
  vehicles,
  open,
  onOpenChange,
}: {
  advance: PendingAdvanceTransferRecord | null
  customers: AdvanceTransferCustomerOption[]
  vehicles: AdvanceTransferVehicleOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const form = useForm<TransferAdvancePaymentInput>({
    resolver: zodResolver(transferAdvancePaymentSchema),
    defaultValues: {
      targetCustomerId: advance?.customerId ?? "",
      targetVehicleId:
        vehicles.find(
          (vehicle) =>
            `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName}`.toLocaleLowerCase() ===
            advance?.bikeModel.trim().toLocaleLowerCase(),
        )?.id ?? "",
    },
  })

  async function onSubmit(values: TransferAdvancePaymentInput) {
    if (!advance) return

    try {
      const result = await transferAdvancePayment(advance.id, values)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success("Advance transferred. A new pending advance was created for the destination.")
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Advance transfer failed:", error)
      toast.error("Unable to transfer this advance. Please try again.")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!form.formState.isSubmitting) onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer advance</DialogTitle>
          <DialogDescription>
            Transfer {formatLKR(advance?.amount)} from {advance?.customerName} ({advance?.bikeModel}).
            The current advance will be marked transferred and a new pending advance created.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="advance-transfer-customer">Destination customer</Label>
            <Controller
              name="targetCustomerId"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger
                      id="advance-transfer-customer"
                      className="w-full"
                      aria-invalid={Boolean(fieldState.error)}
                      onBlur={field.onBlur}
                    >
                      <SelectValue placeholder="Choose a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}{customer.nic ? ` · ${customer.nic}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p role="alert" className="text-xs text-destructive">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="advance-transfer-vehicle">Destination available vehicle</Label>
            <Controller
              name="targetVehicleId"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger
                      id="advance-transfer-vehicle"
                      className="w-full"
                      aria-invalid={Boolean(fieldState.error)}
                      onBlur={field.onBlur}
                    >
                      <SelectValue placeholder="Choose an available vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.vehicleModel.brand} {vehicle.vehicleModel.modelName}
                          {vehicle.color ? ` · ${vehicle.color}` : ""} · {vehicle.chassisNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p role="alert" className="text-xs text-destructive">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                form.formState.isSubmitting ||
                !advance ||
                customers.length === 0 ||
                vehicles.length === 0
              }
            >
              {form.formState.isSubmitting ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AdvanceTransferTable({
  advances,
  customers,
  vehicles,
}: AdvanceTransferTableProps) {
  const [selectedAdvance, setSelectedAdvance] =
    React.useState<PendingAdvanceTransferRecord | null>(null)

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Allocated vehicle</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {advances.length ? (
              advances.map((advance) => (
                <TableRow key={advance.id}>
                  <TableCell>
                    {new Date(advance.advanceDate).toLocaleDateString("en-LK", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{advance.customerName}</div>
                    <div className="text-xs text-muted-foreground">{advance.nicNumber}</div>
                  </TableCell>
                  <TableCell>{advance.bikeModel}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatLKR(advance.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setSelectedAdvance(advance)}
                    >
                      <ArrowRightLeft className="size-4" />
                      Transfer
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                  No pending advances are available to transfer.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <TransferAdvanceDialog
        key={selectedAdvance?.id ?? "no-transfer"}
        advance={selectedAdvance}
        customers={customers}
        vehicles={vehicles}
        open={Boolean(selectedAdvance)}
        onOpenChange={(open) => {
          if (!open) setSelectedAdvance(null)
        }}
      />
    </>
  )
}
