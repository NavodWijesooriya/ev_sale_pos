"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { MoreHorizontal, Plus, Search, Undo2, Receipt, Bike, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { refundAdvancePayment } from "@/app/actions/advances"
import type {
  AdvancePaymentBranchOption,
  AdvancePaymentCustomerOption,
  AdvancePaymentRecord,
  AvailableVehicleOption,
} from "@/app/actions/advances"
import { AdvanceFormDialog } from "@/components/sales/advance-form-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
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
  refundAdvancePaymentSchema,
  type RefundAdvancePaymentInput,
} from "@/lib/validations/advance-payment"

interface AdvanceTableProps {
  advances: AdvancePaymentRecord[]
  customers: AdvancePaymentCustomerOption[]
  branches: AdvancePaymentBranchOption[]
  vehicles: AvailableVehicleOption[]
}

type StatusFilter = "ALL" | "PENDING" | "USED" | "REFUNDED" | "TRANSFERRED"

function RefundDialog({
  advance,
  open,
  onOpenChange,
}: {
  advance: AdvancePaymentRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const form = useForm<RefundAdvancePaymentInput>({
    resolver: zodResolver(refundAdvancePaymentSchema),
    defaultValues: { paymentMethod: "Cash" },
  })

  async function onSubmit(values: RefundAdvancePaymentInput) {
    if (!advance) return

    try {
      const result = await refundAdvancePayment(advance.id, values)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(`Advance payment for ${advance.customerName} has been refunded.`)
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Refund failed:", error)
      toast.error("Unable to refund this advance payment.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund Advance Payment</DialogTitle>
          <DialogDescription>
            Refund the full amount of {formatLKR(advance?.amount ?? 0)} to {advance?.customerName}.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="advance-refund-method">Refund payment method</Label>
            <Controller
              name="paymentMethod"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    if (value === "Cash" || value === "Card" || value === "BankTransfer" || value === "CHEQUE") {
                      field.onChange(value)
                    }
                  }}
                >
                  <SelectTrigger
                    id="advance-refund-method"
                    className="w-full"
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder="Select a payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="BankTransfer">Bank transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={form.formState.isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting || !advance}>
              Confirm refund
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PENDING") {
    return <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10">Pending</Badge>
  }
  if (status === "USED") {
    return <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10">Used</Badge>
  }
  if (status === "REFUNDED") {
    return <Badge variant="secondary">Refunded</Badge>
  }
  return <Badge variant="outline">{status}</Badge>
}

export function AdvanceTable({ advances, customers, branches, vehicles }: AdvanceTableProps) {
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL")
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [refundingAdvance, setRefundingAdvance] = React.useState<AdvancePaymentRecord | null>(null)

  const filteredAdvances = React.useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return advances.filter((advance) => {
      const matchesStatus = statusFilter === "ALL" || advance.status === statusFilter
      const matchesQuery =
        !query ||
        advance.customerName.toLocaleLowerCase().includes(query) ||
        advance.nicNumber.toLocaleLowerCase().includes(query) ||
        advance.bikeModel.toLocaleLowerCase().includes(query) ||
        (advance.chassisNumber && advance.chassisNumber.toLocaleLowerCase().includes(query)) ||
        (advance.paymentMethod && advance.paymentMethod.toLocaleLowerCase().includes(query))
      return matchesStatus && matchesQuery
    })
  }, [advances, search, statusFilter])

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search advance payments"
              placeholder="Search customer, chassis no, model..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter((value ?? "ALL") as StatusFilter)}
          >
            <SelectTrigger aria-label="Filter by status" className="w-full sm:w-44 bg-background">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="USED">Used</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
              <SelectItem value="TRANSFERRED">Transferred</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Primary Action Button */}
        <Button onClick={() => setIsAddOpen(true)} className="gap-2 shrink-0 shadow-xs">
          <Plus className="size-4" />
          <span>Add Advance</span>
        </Button>
      </div>

      {/* Main DataTable */}
      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-32">Date</TableHead>
              <TableHead className="w-[24%]">Customer Name</TableHead>
              <TableHead className="w-[26%]">Vehicle Chassis No</TableHead>
              <TableHead className="w-[16%]">Payment Method</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAdvances.map((advance) => {
              const displayDate = new Date(advance.advanceDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })

              return (
                <TableRow key={advance.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {displayDate}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm text-foreground">{advance.customerName}</div>
                    {advance.nicNumber && advance.nicNumber !== "N/A" && (
                      <div className="text-xs text-muted-foreground font-mono">NIC: {advance.nicNumber}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {advance.chassisNumber ? (
                      <div>
                        <div className="font-mono text-xs font-semibold text-foreground">
                          {advance.chassisNumber}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{advance.bikeModel}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs font-medium text-foreground">{advance.bikeModel}</div>
                        <div className="text-[11px] text-muted-foreground">General Advance</div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-foreground">
                      {advance.paymentMethod || advance.paymentDetails || "Cash"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={advance.status} />
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm tabular-nums text-foreground">
                    {formatLKR(advance.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="size-8" aria-label="Open menu">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={advance.status !== "PENDING"}
                          onClick={() => setRefundingAdvance(advance)}
                        >
                          <Undo2 className="size-4 text-muted-foreground" />
                          <span>Refund Advance</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
            {filteredAdvances.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                  No advance payments found matching your filter criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Unified Add Advance Dialog */}
      <AdvanceFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        initialCustomers={customers}
        vehicles={vehicles}
      />

      {/* Refund Modal */}
      <RefundDialog
        advance={refundingAdvance}
        open={Boolean(refundingAdvance)}
        onOpenChange={(open) => !open && setRefundingAdvance(null)}
      />
    </div>
  )
}
