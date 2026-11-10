"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { MoreHorizontal, Pencil, Search, Undo2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { refundAdvancePayment } from "@/app/actions/advances"
import type {
  AdvancePaymentBranchOption,
  AdvancePaymentCustomerOption,
  AdvancePaymentRecord,
} from "@/app/actions/advances"
import { NewAdvanceDialog } from "@/components/sales/advances/new-advance-dialog"
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
}

type StatusFilter = "ALL" | AdvancePaymentRecord["status"]

function getStatusStyle(status: AdvancePaymentRecord["status"]) {
  switch (status) {
    case "PENDING":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400"
    case "USED":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    case "REFUNDED":
    case "TRANSFERRED":
      return "border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-300"
  }
}

function RefundAdvanceDialog({
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

      toast.success("Advance payment refunded.")
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Advance refund failed:", error)
      toast.error("Unable to refund this advance. Please try again.")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (form.formState.isSubmitting) return
        if (nextOpen) form.reset({ paymentMethod: "Cash" })
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refund advance payment</DialogTitle>
          <DialogDescription>
            Refund the full amount of {formatLKR(advance?.amount)} to {advance?.customerName}.
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
              {form.formState.isSubmitting ? "Refunding..." : "Confirm Refund"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AdvanceTable({ advances, customers, branches }: AdvanceTableProps) {
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL")
  const [editingAdvance, setEditingAdvance] = React.useState<AdvancePaymentRecord | null>(null)
  const [refundingAdvance, setRefundingAdvance] = React.useState<AdvancePaymentRecord | null>(null)

  const filteredAdvances = React.useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return advances.filter((advance) => {
      const matchesStatus = statusFilter === "ALL" || advance.status === statusFilter
      const matchesQuery =
        !query ||
        advance.customerName.toLocaleLowerCase().includes(query) ||
        advance.nicNumber.toLocaleLowerCase().includes(query) ||
        advance.bikeModel.toLocaleLowerCase().includes(query)
      return matchesStatus && matchesQuery
    })
  }, [advances, search, statusFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search advance payments"
              placeholder="Search customer, NIC, or bike model..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter((value ?? "ALL") as StatusFilter)}
          >
            <SelectTrigger aria-label="Filter by status" className="w-full sm:w-44">
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
        <NewAdvanceDialog customers={customers} branches={branches} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Customer Name</TableHead>
              <TableHead>NIC</TableHead>
              <TableHead>Bike Model</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAdvances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                  {advances.length === 0
                    ? "No advance payments have been recorded yet."
                    : "No advance payments match your search or status filter."}
                </TableCell>
              </TableRow>
            ) : (
              filteredAdvances.map((advance) => (
                <TableRow key={advance.id}>
                  <TableCell className="font-medium">{advance.customerName}</TableCell>
                  <TableCell>{advance.nicNumber}</TableCell>
                  <TableCell>{advance.bikeModel}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatLKR(advance.amount)}
                  </TableCell>
                  <TableCell>
                    {new Date(advance.advanceDate).toLocaleDateString("en-LK", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusStyle(advance.status)}>
                      {advance.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${advance.customerName}`} />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={advance.status !== "PENDING"}
                          onClick={() => setEditingAdvance(advance)}
                        >
                          <Pencil />
                          Edit
                        </DropdownMenuItem>
                        {advance.status === "PENDING" && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setRefundingAdvance(advance)}
                          >
                            <Undo2 />
                            Refund
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewAdvanceDialog
        key={editingAdvance?.id ?? "no-edit"}
        customers={customers}
        branches={branches}
        advance={editingAdvance ?? undefined}
        open={Boolean(editingAdvance)}
        onOpenChange={(open) => {
          if (!open) setEditingAdvance(null)
        }}
        hideTrigger
      />
      <RefundAdvanceDialog
        key={refundingAdvance?.id ?? "no-refund"}
        advance={refundingAdvance}
        open={Boolean(refundingAdvance)}
        onOpenChange={(open) => {
          if (!open) setRefundingAdvance(null)
        }}
      />
    </div>
  )
}
