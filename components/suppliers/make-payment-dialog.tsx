"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import {
  allocateAdvanceToGrns,
  getSupplierPayableDetails,
  recordSupplierPayment,
} from "@/app/actions/supplier-payments"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import { formatDate, formatMoney, nativeSelectClass, todayISO } from "./shared"

type Method = "Cash" | "BankTransfer" | "CHEQUE" | "ADVANCE"

interface PayableGrn {
  id: string
  grnNumber: string
  date: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
}

interface MakePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suppliers: { id: string; name: string }[]
  initialSupplierId?: string
  /** Pre-select this GRN and fill its balance. */
  initialGrnId?: string
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function MakePaymentDialog({
  open,
  onOpenChange,
  suppliers,
  initialSupplierId,
  initialGrnId,
}: MakePaymentDialogProps) {
  const router = useRouter()
  const [supplierId, setSupplierId] = React.useState(initialSupplierId ?? "")
  const [method, setMethod] = React.useState<Method>("Cash")
  const [amount, setAmount] = React.useState("")
  const [paymentDate, setPaymentDate] = React.useState(todayISO())
  const [referenceNo, setReferenceNo] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [chequeNumber, setChequeNumber] = React.useState("")
  const [bankName, setBankName] = React.useState("")
  const [chequeDate, setChequeDate] = React.useState(todayISO())
  const [grns, setGrns] = React.useState<PayableGrn[]>([])
  const [advanceBalance, setAdvanceBalance] = React.useState(0)
  const [alloc, setAlloc] = React.useState<Record<string, string>>({})
  const [loading, setLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  // Reset whenever the dialog is (re)opened
  React.useEffect(() => {
    if (!open) return
    setSupplierId(initialSupplierId ?? "")
    setMethod("Cash")
    setAmount("")
    setPaymentDate(todayISO())
    setReferenceNo("")
    setNotes("")
    setChequeNumber("")
    setBankName("")
    setChequeDate(todayISO())
    setAlloc({})
  }, [open, initialSupplierId])

  // Load payable GRNs for the chosen supplier
  React.useEffect(() => {
    if (!open || !supplierId) {
      setGrns([])
      setAdvanceBalance(0)
      return
    }
    let cancelled = false
    setLoading(true)
    getSupplierPayableDetails(supplierId)
      .then((details) => {
        if (cancelled) return
        setGrns(details.grns)
        setAdvanceBalance(details.advanceBalance)
        const target = details.grns.find((g) => g.id === initialGrnId)
        if (target) {
          setAlloc({ [target.id]: String(target.balanceAmount) })
          setAmount(String(target.balanceAmount))
        } else {
          setAlloc({})
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load GRNs."))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [open, supplierId, initialGrnId])

  const isAdvanceMode = method === "ADVANCE"
  const paymentAmount = Number(amount) || 0
  const allocated = round2(Object.values(alloc).reduce((sum, v) => sum + (Number(v) || 0), 0))
  const remainder = round2(paymentAmount - allocated)
  const limit = isAdvanceMode ? advanceBalance : paymentAmount

  function setGrnAmount(grnId: string, value: string) {
    setAlloc((current) => ({ ...current, [grnId]: value }))
  }

  /** Fills oldest GRNs first until the available money runs out. */
  function autoAllocate() {
    let left = isAdvanceMode ? advanceBalance : paymentAmount
    const next: Record<string, string> = {}
    for (const grn of grns) {
      if (left <= 0) break
      const take = round2(Math.min(left, grn.balanceAmount))
      next[grn.id] = String(take)
      left = round2(left - take)
    }
    setAlloc(next)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const allocations = Object.entries(alloc)
      .map(([grnId, value]) => ({ grnId, amount: Number(value) || 0 }))
      .filter((a) => a.amount > 0)

    for (const a of allocations) {
      const grn = grns.find((g) => g.id === a.grnId)
      if (grn && a.amount > grn.balanceAmount + 0.005) {
        toast.error(`${grn.grnNumber}: amount exceeds the balance of ${formatMoney(grn.balanceAmount)}.`)
        return
      }
    }

    setSubmitting(true)
    try {
      const result = isAdvanceMode
        ? await allocateAdvanceToGrns({ supplierId, allocations })
        : await recordSupplierPayment({
            supplierId,
            method,
            amount: paymentAmount,
            paymentDate,
            referenceNo,
            notes,
            allocations,
            cheque: method === "CHEQUE" ? { chequeNumber, bankName, chequeDate } : undefined,
          })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed.")
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = isAdvanceMode
    ? allocated > 0 && allocated <= advanceBalance + 0.005
    : paymentAmount > 0 && allocated <= paymentAmount + 0.005

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Make supplier payment</DialogTitle>
          <DialogDescription>
            Split one payment across several GRNs. Anything left unallocated is kept as a supplier advance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pay-supplier">Supplier</Label>
              <select
                id="pay-supplier"
                className={nativeSelectClass}
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value)
                  setAlloc({})
                }}
                required
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-method">Payment method</Label>
              <select
                id="pay-method"
                className={nativeSelectClass}
                value={method}
                onChange={(e) => setMethod(e.target.value as Method)}
              >
                <option value="Cash">Cash</option>
                <option value="BankTransfer">Bank transfer</option>
                <option value="CHEQUE">Cheque</option>
                {advanceBalance > 0 && <option value="ADVANCE">Use advance ({formatMoney(advanceBalance)})</option>}
              </select>
            </div>

            {!isAdvanceMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pay-amount">Amount (Rs.)</Label>
                  <Input
                    id="pay-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay-date">Payment date</Label>
                  <Input id="pay-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
                </div>
              </>
            )}

            {method === "BankTransfer" && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pay-ref">Transfer reference</Label>
                <Input id="pay-ref" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} maxLength={120} />
              </div>
            )}

            {method === "CHEQUE" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="chq-no">Cheque number</Label>
                  <Input id="chq-no" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} required maxLength={40} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chq-bank">Bank</Label>
                  <Input id="chq-bank" value={bankName} onChange={(e) => setBankName(e.target.value)} required maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chq-date">Cheque date</Label>
                  <Input id="chq-date" type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} required />
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Allocate to GRNs</Label>
              <Button type="button" variant="outline" size="sm" onClick={autoAllocate} disabled={!grns.length}>
                Auto-allocate oldest first
              </Button>
            </div>
            <div className="rounded-lg border">
              {loading ? (
                <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" /> Loading GRNs…
                </p>
              ) : !supplierId ? (
                <p className="p-4 text-sm text-muted-foreground">Select a supplier to see unpaid GRNs.</p>
              ) : !grns.length ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No unpaid GRNs for this supplier. Any amount will be recorded as an advance.
                </p>
              ) : (
                <ul className="divide-y">
                  {grns.map((grn) => (
                    <li key={grn.id} className="grid grid-cols-[1fr_auto] items-center gap-3 p-3 sm:grid-cols-[1fr_9rem_9rem]">
                      <div>
                        <p className="text-sm font-medium">{grn.grnNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(grn.date)} · Total {formatMoney(grn.totalAmount)}
                        </p>
                      </div>
                      <p className="hidden text-right text-sm sm:block">
                        <span className="block text-xs text-muted-foreground">Balance</span>
                        {formatMoney(grn.balanceAmount)}
                      </p>
                      <Input
                        type="number"
                        min="0"
                        max={grn.balanceAmount}
                        step="0.01"
                        placeholder="0.00"
                        aria-label={`Amount for ${grn.grnNumber}`}
                        value={alloc[grn.id] ?? ""}
                        onChange={(e) => setGrnAmount(grn.id, e.target.value)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isAdvanceMode ? (
                <>Allocated {formatMoney(allocated)} of {formatMoney(limit)} advance available.</>
              ) : (
                <>
                  Allocated {formatMoney(allocated)} · {remainder >= 0 ? "Kept as advance" : "Over-allocated by"}{" "}
                  <span className={remainder < 0 ? "font-medium text-destructive" : "font-medium text-foreground"}>
                    {formatMoney(Math.abs(remainder))}
                  </span>
                </>
              )}
            </p>
          </div>

          {!isAdvanceMode && (
            <div className="space-y-2">
              <Label htmlFor="pay-notes">Notes</Label>
              <Textarea id="pay-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !supplierId || !canSubmit}>
              {submitting && <LoaderCircle className="size-4 animate-spin" />}
              {isAdvanceMode ? "Apply advance" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
