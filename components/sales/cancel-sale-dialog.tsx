"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Ban, Loader2, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cancelSale, getSaleCancelPreview, type CancelPreview } from "@/app/actions/sale-cancel"
import {
  CANCEL_REFUND_METHODS,
  CANCEL_REFUND_METHOD_LABELS,
  CANCEL_TYPES,
  CANCEL_TYPE_LABELS,
  type CancelRefundMethod,
  type CancelType,
} from "@/lib/sale-status"
import { formatLKR } from "@/lib/currency"

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/** "Cancel sale" button + confirmation dialog. Shown only to people who hold the Cancel sales permission. */
export function CancelSaleButton({ saleId, invoiceNumber }: { saleId: string; invoiceNumber: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [preview, setPreview] = React.useState<CancelPreview | null>(null)
  const [type, setType] = React.useState<CancelType | "">("")
  const [reason, setReason] = React.useState("")
  const [refund, setRefund] = React.useState("")
  const [method, setMethod] = React.useState<CancelRefundMethod | "">("")
  const [error, setError] = React.useState<string | null>(null)

  async function openDialog() {
    setOpen(true)
    setLoading(true)
    setLoadError(null)
    setError(null)
    const res = await getSaleCancelPreview(saleId)
    setLoading(false)
    if (res.success) setPreview(res.data)
    else setLoadError(res.error)
  }

  async function submit() {
    setError(null)
    if (!type) return setError("Choose why the sale is being cancelled.")
    if (reason.trim().length < 3) return setError("Enter the reason for cancelling this sale.")
    const amount = refund.trim() === "" ? 0 : Number(refund)
    if (!Number.isFinite(amount) || amount < 0) return setError("Enter a valid refund amount.")
    if (amount > 0 && !method) return setError("Choose how the refund is paid (cash, bank or cheque).")
    setSaving(true)
    const res = await cancelSale({ saleId, type, reason, refundAmount: amount, refundMethod: amount > 0 && method ? method : undefined })
    setSaving(false)
    if (res.success) {
      toast.success(res.message)
      setOpen(false)
      router.refresh()
    } else {
      setError(res.error)
    }
  }

  const blocked = (preview?.blockers.length ?? 0) > 0

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid="cancel-sale-button"
        className="h-9 gap-1.5 border-red-500/40 text-xs font-medium text-red-600 hover:bg-red-500/10 hover:text-red-600"
        onClick={openDialog}
      >
        <Ban className="size-4" />
        Cancel sale
      </Button>

      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Cancel sale {invoiceNumber}</DialogTitle>
            <DialogDescription>
              The sale is never deleted: it stays in Sales History marked CANCELLED.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Checking what this cancellation would affect...
            </div>
          )}
          {loadError && <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">{loadError}</p>}

          {preview && blocked && (
            <div data-testid="cancel-blockers" className="space-y-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-red-600">
                <ShieldAlert className="size-4" /> This sale cannot be cancelled yet
              </p>
              <ul className="list-disc space-y-1 pl-5 text-red-700 dark:text-red-300">
                {preview.blockers.map((b) => (
                  <li key={b.code}>{b.message}</li>
                ))}
              </ul>
            </div>
          )}

          {preview && !blocked && (
            <div className="space-y-4">
              <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Cancelling will, in one step:</p>
                <ul className="list-disc space-y-0.5 pl-5">
                  {preview.effects.map((effect) => (
                    <li key={effect}>{effect}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cancel-type">Type</Label>
                <select id="cancel-type" className={selectClass} value={type} onChange={(e) => setType(e.target.value as CancelType | "")}>
                  <option value="">Choose...</option>
                  {CANCEL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {CANCEL_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cancel-reason">Reason (required)</Label>
                <Textarea id="cancel-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this sale being cancelled?" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cancel-refund">Refund to customer (optional, Rs.)</Label>
                  <Input id="cancel-refund" type="number" min={0} step="0.01" value={refund} onChange={(e) => setRefund(e.target.value)} placeholder="0.00" />
                  <p className="text-[11px] text-muted-foreground">Up to {formatLKR(preview.maxRefund)}, what the customer paid.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cancel-refund-method">Refund method</Label>
                  <select id="cancel-refund-method" className={selectClass} value={method} onChange={(e) => setMethod(e.target.value as CancelRefundMethod | "")}>
                    <option value="">Choose...</option>
                    {CANCEL_REFUND_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {CANCEL_REFUND_METHOD_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" data-testid="cancel-error" className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>
              Close
            </Button>
            {preview && !blocked && (
              <Button type="button" variant="destructive" disabled={saving} onClick={submit} data-testid="confirm-cancel-sale">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
                Cancel this sale
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
