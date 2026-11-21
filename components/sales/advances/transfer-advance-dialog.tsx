"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRightLeft, Bike, User, FileText, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import {
  transferAdvancePayment,
  type AdvancePaymentCustomerOption,
  type AvailableVehicleOption,
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatLKR } from "@/lib/currency"
import { Badge } from "@/components/ui/badge"
import {
  transferAdvancePaymentSchema,
  type TransferAdvancePaymentInput,
} from "@/lib/validations/advance-payment"

interface TransferAdvanceDialogProps {
  advance: {
    id: string
    customerId: string
    customerName: string
    nicNumber: string
    bikeModel: string
    chassisNumber?: string | null
    amount: number
  } | null
  customers: AdvancePaymentCustomerOption[]
  vehicles: Array<{
    id: string
    chassisNumber: string
    unitGrnNumber?: string | null
    color?: string | null
    vehicleModel: {
      brand: string
      modelName: string
    }
  }>
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransferAdvanceDialog({
  advance,
  customers,
  vehicles,
  open,
  onOpenChange,
}: TransferAdvanceDialogProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<TransferAdvancePaymentInput>({
    resolver: zodResolver(transferAdvancePaymentSchema),
    defaultValues: {
      targetCustomerId: advance?.customerId ?? "",
      targetVehicleId: "",
      transferNote: "",
      sourceNic: "",
      targetNic: "",
    },
  })
  // Moving the advance to a different customer needs the NIC of both people.
  const movesToAnotherCustomer = Boolean(advance) && form.watch("targetCustomerId") !== advance?.customerId

  React.useEffect(() => {
    if (advance && open) {
      form.reset({
        targetCustomerId: advance.customerId,
        targetVehicleId: "",
        transferNote: "",
        sourceNic: "",
        targetNic: "",
      })
    }
  }, [advance, open, form])

  async function onSubmit(values: TransferAdvancePaymentInput) {
    if (!advance) return

    setIsSubmitting(true)
    try {
      const result = await transferAdvancePayment(advance.id, values)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(
        `Advance of ${formatLKR(advance.amount)} successfully transferred! New pending advance created.`,
      )
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Advance transfer failed:", error)
      toast.error("Unable to transfer this advance. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!advance) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <ArrowRightLeft className="size-4" />
            </div>
            <DialogTitle className="text-lg font-bold">Transfer Advance Balance</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Reallocate this unconsumed deposit to a different vehicle or a different customer. The original record will be marked as Transferred for complete audit tracking.
          </DialogDescription>
        </DialogHeader>

        {/* Current Advance Source Summary */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Source Customer:</span>
            <span className="font-semibold text-foreground">{advance.customerName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Current Allocation:</span>
            <span className="font-mono font-medium text-foreground">
              {advance.chassisNumber ? `VIN: ${advance.chassisNumber}` : advance.bikeModel}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-border/40">
            <span className="text-muted-foreground font-medium">Transferrable Balance:</span>
            <span className="font-mono font-bold text-sm text-primary">
              {formatLKR(advance.amount)}
            </span>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Target Customer */}
          <div className="space-y-1.5">
            <Label htmlFor="targetCustomerId" className="text-xs font-semibold flex items-center gap-1.5">
              <User className="size-3.5 text-primary" />
              <span>Destination Customer</span>
            </Label>
            <Controller
              control={form.control}
              name="targetCustomerId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="targetCustomerId" className="h-9 text-xs">
                    <SelectValue placeholder="Select destination customer..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name} {c.nic ? `(${c.nic})` : ""} {c.id === advance.customerId ? "• (Current Customer)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.targetCustomerId && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.targetCustomerId.message}
              </p>
            )}
          </div>

          {movesToAnotherCustomer && (
            <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-[11px] font-medium text-foreground">
                NIC verification: type at least 4 characters of each customer&apos;s NIC to confirm who the money moves between.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="sourceNic" className="text-xs font-semibold">
                  Advance holder NIC ({advance.customerName})
                </Label>
                <Input id="sourceNic" autoComplete="off" className="h-9 text-xs" {...form.register("sourceNic")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="targetNic" className="text-xs font-semibold">
                  Receiving customer NIC
                </Label>
                <Input id="targetNic" autoComplete="off" className="h-9 text-xs" {...form.register("targetNic")} />
              </div>
            </div>
          )}

          {/* Target Vehicle (Chassis / Unit GRN) */}
          <div className="space-y-1.5">
            <Label htmlFor="targetVehicleId" className="text-xs font-semibold flex items-center gap-1.5">
              <Bike className="size-3.5 text-emerald-600" />
              <span>Destination Vehicle (Chassis / Unit GRN)</span>
            </Label>
            <Controller
              control={form.control}
              name="targetVehicleId"
              render={({ field }) => (
                <Select value={field.value || "NONE"} onValueChange={(val) => field.onChange(val === "NONE" ? "" : val)}>
                  <SelectTrigger id="targetVehicleId" className="h-9 text-xs">
                    <SelectValue placeholder="Select vehicle or keep as general advance..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="NONE" className="text-xs font-medium text-muted-foreground">
                      Keep as General Advance (No specific bike allocated)
                    </SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {v.vehicleModel.brand} {v.vehicleModel.modelName} · {v.unitGrnNumber ? `[${v.unitGrnNumber}] ` : ""}VIN: {v.chassisNumber} {v.color ? `(${v.color})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-[11px] text-muted-foreground">
              Select an available in-stock electric bike to reserve it for this advance.
            </p>
          </div>

          {/* Transfer Note */}
          <div className="space-y-1.5">
            <Label htmlFor="transferNote" className="text-xs font-semibold flex items-center gap-1.5">
              <FileText className="size-3.5 text-muted-foreground" />
              <span>Transfer Reason / Audit Note</span>
            </Label>
            <Textarea
              id="transferNote"
              placeholder="e.g. Customer decided to change model/color, or reallocated to family member..."
              {...form.register("transferNote")}
              className="text-xs resize-none h-18"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              <ArrowRightLeft className="size-3.5" />
              {isSubmitting ? "Transferring..." : "Confirm Advance Transfer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
