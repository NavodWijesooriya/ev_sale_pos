"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { getCompanyAllocatableSales, recordFinanceReceipt } from "@/app/actions/finance-receivables"
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
import { colomboDateKey } from "@/lib/dates"
import { round2 } from "@/lib/finance-receivables"

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 dark:bg-input/30"

const money = (n: number) =>
  `Rs. ${new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`

type Method = "BankTransfer" | "CHEQUE" | "Cash"

interface AllocatableSale {
  financeDetailId: string
  invoiceNumber: string
  saleDate: string
  customerName: string
  totalFinanceAmount: number
  balanceAmount: number
  availableAmount: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: { id: string; name: string }[]
  initialCompanyId?: string
  /** Pre-select this sale and fill its balance. */
  initialFinanceDetailId?: string
}

export function ReceiveFinancePaymentDialog(props: Props) {
  // Mount the form fresh on every open so its state starts clean.
  if (!props.open) return null
  return <ReceiveFinancePaymentForm {...props} />
}

function ReceiveFinancePaymentForm({ onOpenChange, companies, initialCompanyId, initialFinanceDetailId }: Props) {
  const router = useRouter()
  const today = colomboDateKey(new Date())
  const [companyId, setCompanyId] = React.useState(initialCompanyId ?? "")
  const [method, setMethod] = React.useState<Method>("BankTransfer")
  const [amount, setAmount] = React.useState("")
  const [date, setDate] = React.useState(today)
  const [referenceNo, setReferenceNo] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [chequeNumber, setChequeNumber] = React.useState("")
  const [bankName, setBankName] = React.useState("")
  const [chequeDate, setChequeDate] = React.useState(today)
  const [loaded, setLoaded] = React.useState<{ companyId: string; sales: AllocatableSale[] } | null>(null)
  const [alloc, setAlloc] = React.useState<Record<string, string>>({})
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!companyId) return
    let cancelled = false
    getCompanyAllocatableSales(companyId)
      .then((sales) => {
        if (cancelled) return
        setLoaded({ companyId, sales })
        const target = sales.find((s) => s.financeDetailId === initialFinanceDetailId)
        if (target) {
          setAlloc({ [target.financeDetailId]: String(target.availableAmount) })
          setAmount(String(target.availableAmount))
        } else {
          setAlloc({})
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load the sales."))
    return () => {
      cancelled = true
    }
  }, [companyId, initialFinanceDetailId])

  const current = loaded?.companyId === companyId ? loaded : null
  const sales = current?.sales ?? []
  const loading = Boolean(companyId) && !current
  const paymentAmount = Number(amount) || 0
  const allocated = round2(Object.values(alloc).reduce((sum, v) => sum + (Number(v) || 0), 0))
  const difference = round2(paymentAmount - allocated)
  const balanced = paymentAmount > 0 && Math.abs(difference) < 0.005

  /** Fills the oldest sales first until the payment amount is used up. */
  function autoAllocate() {
    let left = paymentAmount
    const next: Record<string, string> = {}
    for (const sale of sales) {
      if (left <= 0) break
      const take = round2(Math.min(left, sale.availableAmount))
      next[sale.financeDetailId] = String(take)
      left = round2(left - take)
    }
    setAlloc(next)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const allocations = Object.entries(alloc)
      .map(([financeDetailId, value]) => ({ financeDetailId, amount: Number(value) || 0 }))
      .filter((a) => a.amount > 0)

    for (const a of allocations) {
      const sale = sales.find((s) => s.financeDetailId === a.financeDetailId)
      if (sale && a.amount > sale.availableAmount + 0.005) {
        toast.error(`${sale.invoiceNumber}: amount exceeds the ${money(sale.availableAmount)} still receivable.`)
        return
      }
    }

    setSubmitting(true)
    try {
      const result = await recordFinanceReceipt({
        financeCompanyId: companyId,
        method,
        amount: paymentAmount,
        receiptDate: date,
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
      toast.error(error instanceof Error ? error.message : "Could not record the payment.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Receive finance payment</DialogTitle>
          <DialogDescription>
            Record a payment from a finance company and split it across the sales it pays for.
            {method === "CHEQUE" && " A cheque only reduces the balances once it clears."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fin-company">Finance company</Label>
              <select
                id="fin-company"
                className={selectClass}
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value)
                  setAlloc({})
                }}
                required
              >
                <option value="">Select finance company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin-method">Payment method</Label>
              <select id="fin-method" className={selectClass} value={method} onChange={(e) => setMethod(e.target.value as Method)}>
                <option value="BankTransfer">Bank transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin-amount">Amount (Rs.)</Label>
              <Input id="fin-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin-date">Payment date</Label>
              <Input id="fin-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            {method !== "CHEQUE" && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="fin-ref">Reference (transfer / receipt no.)</Label>
                <Input id="fin-ref" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} maxLength={120} />
              </div>
            )}

            {method === "CHEQUE" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fin-chq-no">Cheque number</Label>
                  <Input id="fin-chq-no" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} required maxLength={40} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fin-chq-bank">Bank</Label>
                  <Input id="fin-chq-bank" value={bankName} onChange={(e) => setBankName(e.target.value)} required maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fin-chq-date">Cheque date</Label>
                  <Input id="fin-chq-date" type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} required />
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Allocate to sales</Label>
              <Button type="button" variant="outline" size="sm" onClick={autoAllocate} disabled={!sales.length || paymentAmount <= 0}>
                Auto-allocate oldest first
              </Button>
            </div>
            <div className="rounded-lg border">
              {loading ? (
                <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" /> Loading sales…
                </p>
              ) : !companyId ? (
                <p className="p-4 text-sm text-muted-foreground">Select a finance company to see what it still owes.</p>
              ) : !sales.length ? (
                <p className="p-4 text-sm text-muted-foreground">This company owes nothing right now.</p>
              ) : (
                <ul className="divide-y">
                  {sales.map((sale) => (
                    <li key={sale.financeDetailId} className="grid grid-cols-[1fr_auto] items-center gap-3 p-3 sm:grid-cols-[1fr_9rem_9rem]">
                      <div>
                        <p className="text-sm font-medium">{sale.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {colomboDateKey(new Date(sale.saleDate))} · {sale.customerName}
                        </p>
                      </div>
                      <p className="hidden text-right text-sm sm:block">
                        <span className="block text-xs text-muted-foreground">Receivable</span>
                        {money(sale.availableAmount)}
                      </p>
                      <Input
                        type="number"
                        min="0"
                        max={sale.availableAmount}
                        step="0.01"
                        placeholder="0.00"
                        aria-label={`Amount for ${sale.invoiceNumber}`}
                        value={alloc[sale.financeDetailId] ?? ""}
                        onChange={(e) => setAlloc((cur) => ({ ...cur, [sale.financeDetailId]: e.target.value }))}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Allocated {money(allocated)} of {money(paymentAmount)}
              {!balanced && paymentAmount > 0 && (
                <span className="ml-2 font-medium text-destructive">
                  {difference > 0 ? `${money(difference)} still to allocate` : `${money(-difference)} over-allocated`}
                </span>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fin-notes">Notes</Label>
            <Textarea id="fin-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !companyId || !balanced}>
              {submitting && <LoaderCircle className="size-4 animate-spin" />}
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
