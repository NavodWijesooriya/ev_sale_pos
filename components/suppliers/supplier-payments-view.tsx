"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HandCoins, LoaderCircle, Wallet } from "lucide-react"
import { toast } from "sonner"
import {
  setGrnPayable,
  type SupplierGrnRow,
  type SupplierPaymentsOverview,
} from "@/app/actions/supplier-payments"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MakePaymentDialog } from "./make-payment-dialog"
import { formatDate, formatMoney, nativeSelectClass, StatusBadge } from "./shared"

type StatusFilter = "ALL" | "UNPAID" | "PARTIAL" | "PAID"

export function SupplierPaymentsView({ overview }: { overview: SupplierPaymentsOverview }) {
  const router = useRouter()
  const [supplierFilter, setSupplierFilter] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL")
  const [payOpen, setPayOpen] = React.useState(false)
  const [payTarget, setPayTarget] = React.useState<{ supplierId?: string; grnId?: string }>({})
  const [setupGrn, setSetupGrn] = React.useState<SupplierGrnRow | null>(null)
  const [setupSupplier, setSetupSupplier] = React.useState("")
  const [setupTotal, setSetupTotal] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const rows = overview.grns.filter(
    (g) =>
      (!supplierFilter || g.supplierId === supplierFilter) &&
      (statusFilter === "ALL" || g.paymentStatus === statusFilter),
  )
  const totalOutstanding = overview.suppliers.reduce((s, x) => s + x.outstanding, 0)
  const totalAdvance = overview.suppliers.reduce((s, x) => s + x.advanceBalance, 0)
  const unpaidCount = overview.grns.filter((g) => g.paymentStatus !== "PAID" && g.totalAmount > 0).length

  function openPay(target: { supplierId?: string; grnId?: string } = {}) {
    setPayTarget(target)
    setPayOpen(true)
  }

  function openSetup(grn: SupplierGrnRow) {
    setSetupGrn(grn)
    setSetupSupplier(grn.supplierId ?? "")
    setSetupTotal(grn.totalAmount ? String(grn.totalAmount) : "")
  }

  async function saveSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!setupGrn) return
    setSaving(true)
    try {
      const result = await setGrnPayable({
        grnId: setupGrn.id,
        supplierId: setupSupplier,
        totalAmount: Number(setupTotal),
      })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setSetupGrn(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update GRN.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Supplier Payments</h1>
          <p className="text-sm text-muted-foreground">Track what you owe suppliers per GRN and record payments.</p>
        </div>
        <Button onClick={() => openPay({ supplierId: supplierFilter || undefined })}>
          <HandCoins className="size-4" /> Make payment
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total outstanding" value={formatMoney(totalOutstanding)} />
        <SummaryCard label="Supplier advances held" value={formatMoney(totalAdvance)} />
        <SummaryCard label="GRNs awaiting payment" value={String(unpaidCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GRN balances</CardTitle>
          <CardDescription>
            GRNs with no supplier or amount set must be set up before they can be paid.
          </CardDescription>
          <div className="flex flex-wrap gap-3 pt-2">
            <select
              aria-label="Filter by supplier"
              className={`${nativeSelectClass} sm:w-56`}
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
            >
              <option value="">All suppliers</option>
              {overview.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by status"
              className={`${nativeSelectClass} sm:w-40`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="ALL">All statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GRN</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No GRNs match these filters.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((grn) => {
                const needsSetup = !grn.supplierId || grn.totalAmount <= 0
                return (
                  <TableRow key={grn.id}>
                    <TableCell className="font-medium">{grn.grnNumber}</TableCell>
                    <TableCell>{formatDate(grn.date)}</TableCell>
                    <TableCell>{grn.supplierName ?? <span className="text-muted-foreground">Not set</span>}</TableCell>
                    <TableCell className="text-right">{formatMoney(grn.totalAmount)}</TableCell>
                    <TableCell className="text-right">{formatMoney(grn.paidAmount)}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(grn.balanceAmount)}</TableCell>
                    <TableCell>{needsSetup ? <StatusBadge status="SETUP NEEDED" /> : <StatusBadge status={grn.paymentStatus} />}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => openSetup(grn)}>
                        {needsSetup ? "Set up" : "Edit"}
                      </Button>
                      {!needsSetup && grn.paymentStatus !== "PAID" && (
                        <Button size="sm" onClick={() => openPay({ supplierId: grn.supplierId ?? undefined, grnId: grn.id })}>
                          <Wallet className="size-3.5" /> Pay
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MakePaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        suppliers={overview.suppliers}
        initialSupplierId={payTarget.supplierId}
        initialGrnId={payTarget.grnId}
      />

      <Dialog open={!!setupGrn} onOpenChange={(open) => !open && setSetupGrn(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set payable for {setupGrn?.grnNumber}</DialogTitle>
            <DialogDescription>Assign the supplier and the total amount owed for this GRN.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setup-supplier">Supplier</Label>
              <select
                id="setup-supplier"
                className={nativeSelectClass}
                value={setupSupplier}
                onChange={(e) => setSetupSupplier(e.target.value)}
                required
              >
                <option value="">Select supplier</option>
                {overview.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-total">Total amount (Rs.)</Label>
              <Input
                id="setup-total"
                type="number"
                min="0"
                step="0.01"
                value={setupTotal}
                onChange={(e) => setSetupTotal(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSetupGrn(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <LoaderCircle className="size-4 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
