"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Coins, LoaderCircle } from "lucide-react"
import { recordAdditionalDownPayment } from "@/app/actions/down-payments"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatLKR } from "@/lib/currency"
import { downPaymentBalance, requiredDownPayment } from "@/lib/do-split"

export interface AdditionalDownPaymentData {
  saleId: string
  invoiceNumber: string
  /** Down payment paid at the sale. */
  downPayment: number
  /** Finance amount the sale was made with (before the Delivery Order), and now (the DO amount). */
  originalFinanceAmount: number | null
  financeAmount: number
  due: number
  paid: number
  payments: Array<{ id: string; amount: number; method: string; paymentDate: string; reference: string | null; receivedByName: string }>
}

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/** "Additional down payment due" on the sale page, with the customer's payments and a way to record one. */
export function AdditionalDownPaymentCard({ data, canRecord }: { data: AdditionalDownPaymentData; canRecord: boolean }) {
  const router = useRouter()
  const balance = downPaymentBalance(data.due, data.paid)
  const [open, setOpen] = React.useState(false)
  const [amount, setAmount] = React.useState("")
  const [method, setMethod] = React.useState<"Cash" | "BankTransfer">("Cash")
  const [date, setDate] = React.useState(() => new Date().toLocaleDateString("en-CA"))
  const [reference, setReference] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    const result = await recordAdditionalDownPayment({ saleId: data.saleId, amount: Number(amount), method, paymentDate: date, reference })
    setBusy(false)
    if (result.success) {
      toast.success(result.message)
      setOpen(false)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <Card className="border-amber-500/40 bg-amber-500/5 shadow-sm print:hidden" data-testid="additional-down-payment-card">
      <CardHeader className="border-b border-amber-500/20 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <Coins className="size-4 text-amber-600" /> Additional down payment
          {balance > 0 ? (
            <span data-testid="down-payment-due" className="ml-auto rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
              Additional down payment due: {formatLKR(balance)}
            </span>
          ) : (
            <span className="ml-auto text-xs font-semibold text-emerald-600">Paid in full</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4 text-sm">
        <p className="text-xs text-muted-foreground">
          The Delivery Order was lower than the finance amount
          {data.originalFinanceAmount !== null ? ` (${formatLKR(data.originalFinanceAmount)})` : ""}, so the finance company owes {formatLKR(data.financeAmount)} and the
          customer pays the difference as extra down payment. The bike price is unchanged.
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:max-w-md">
          <dt className="text-muted-foreground">Down payment at the sale</dt>
          <dd className="text-right font-medium">{formatLKR(data.downPayment)}</dd>
          <dt className="text-muted-foreground">Additional down payment</dt>
          <dd className="text-right font-medium">{formatLKR(data.due)}</dd>
          <dt className="text-muted-foreground">Required down payment</dt>
          <dd className="text-right font-medium">{formatLKR(requiredDownPayment(data.downPayment, data.due))}</dd>
          <dt className="text-muted-foreground">Paid so far (additional)</dt>
          <dd className="text-right font-medium">{formatLKR(data.paid)}</dd>
          <dt className="font-semibold">Balance due</dt>
          <dd className={`text-right font-semibold ${balance > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-600"}`}>{formatLKR(balance)}</dd>
        </dl>

        {data.payments.length > 0 && (
          <ul className="divide-y rounded-md border bg-background/60 text-xs" data-testid="down-payment-payments">
            {data.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5">
                <span>
                  {p.paymentDate.slice(0, 10)} · {p.method === "Cash" ? "Cash" : "Bank transfer"}
                  {p.reference ? ` · ${p.reference}` : ""} · {p.receivedByName}
                </span>
                <span className="font-medium">{formatLKR(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}

        {canRecord && balance > 0 && (
          <Button type="button" size="sm" onClick={() => { setAmount(String(balance)); setError(null); setOpen(true) }} data-testid="record-down-payment">
            Record customer payment
          </Button>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Additional down payment: {data.invoiceNumber}</DialogTitle>
            <DialogDescription>Balance due {formatLKR(balance)}. The payment is added to the sale&apos;s down payment and counted in the cash report of the day it is paid.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="adp-amount">Amount (Rs.)</Label>
                <Input id="adp-amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adp-method">Paid by</Label>
                <select id="adp-method" className={selectClass} value={method} onChange={(e) => setMethod(e.target.value as "Cash" | "BankTransfer")}>
                  <option value="Cash">Cash</option>
                  <option value="BankTransfer">Bank transfer</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adp-date">Date</Label>
                <Input id="adp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adp-ref">Reference (optional)</Label>
                <Input id="adp-ref" maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
            </div>
            {error && <p role="alert" data-testid="down-payment-error" className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" disabled={busy} onClick={save} data-testid="confirm-down-payment">
              {busy && <LoaderCircle className="size-4 animate-spin" />} Save payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
