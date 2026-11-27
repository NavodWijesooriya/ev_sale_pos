"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, LoaderCircle, MoreHorizontal, Truck } from "lucide-react"
import {
  markDelivered,
  recordDeliveryOrder,
  submitClaim,
  withdrawClaim,
  type DeliveryOrderRow,
} from "@/app/actions/documents"
import { DoScanControl } from "@/components/documents/do-scan-control"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CLAIM_CHECKLIST, emptyChecklist, type ClaimChecklist } from "@/lib/documents"
import { planDoSplit, requiredDownPayment } from "@/lib/do-split"
import { formatLKR } from "@/lib/currency"

const today = () => new Date().toLocaleDateString("en-CA")

type DialogKind = "do" | "deliver" | "claim" | "withdraw" | null

/** Stage-aware buttons (and their dialogs) for one finance sale's Delivery Order. Read-only without MANAGE_DOCUMENTS. */
export function DeliveryOrderActions({
  row,
  canManage,
  canOverride,
  compact = false,
}: {
  row: DeliveryOrderRow
  canManage: boolean
  canOverride: boolean
  compact?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState<DialogKind>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = React.useState<string | null>(null)
  const [higherWarning, setHigherWarning] = React.useState<string | null>(null)

  // Form state (re-seeded whenever a dialog opens)
  const [doNumber, setDoNumber] = React.useState("")
  const [doDate, setDoDate] = React.useState(today())
  const [doAmount, setDoAmount] = React.useState("")
  const [expiry, setExpiry] = React.useState("")
  const [office, setOffice] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [deliveredAt, setDeliveredAt] = React.useState(today())
  const [reason, setReason] = React.useState("")
  const [claimDate, setClaimDate] = React.useState(today())
  const [reference, setReference] = React.useState("")
  const [checklist, setChecklist] = React.useState<ClaimChecklist>(emptyChecklist())

  function openDialog(kind: Exclude<DialogKind, null>) {
    setError(null)
    setDuplicateWarning(null)
    setHigherWarning(null)
    if (kind === "do") {
      setDoNumber(row.doNumber ?? "")
      setDoDate(row.doDate ?? today())
      setDoAmount(row.doAmount !== null ? String(row.doAmount) : row.financeAmount !== null ? String(row.financeAmount) : "")
      setExpiry(row.expiryDate ?? "")
      setOffice(row.financeOffice ?? "")
      setNotes(row.notes ?? "")
    }
    if (kind === "deliver") {
      setDeliveredAt(row.deliveredAt ?? today())
      setReason("")
    }
    if (kind === "claim") {
      setClaimDate(today())
      setReference("")
      setChecklist({ ...emptyChecklist(), deliveryOrder: true, invoice: true })
    }
    if (kind === "withdraw") setReason("")
    setOpen(kind)
  }

  async function run(action: () => Promise<{ success: boolean; error?: string; message?: string; duplicate?: boolean; needsOwnerConfirm?: boolean }>) {
    setBusy(true)
    setError(null)
    setDuplicateWarning(null)
    setHigherWarning(null)
    const result = await action()
    setBusy(false)
    if (result.success) {
      toast.success(result.message ?? "Saved.")
      setOpen(null)
      router.refresh()
    } else if (result.duplicate) {
      setDuplicateWarning(result.error ?? "This DO number is already used.")
    } else if (result.needsOwnerConfirm) {
      setHigherWarning(result.error ?? "The DO amount is higher than the finance amount.")
    } else {
      setError(result.error ?? "Something went wrong.")
    }
  }

  function saveDo(confirmDuplicate: boolean, confirmHigherAmount = false) {
    return run(() =>
      recordDeliveryOrder({ saleId: row.saleId, doNumber, doDate, doAmount: Number(doAmount), expiryDate: expiry, financeOfficeName: office, notes, confirmDuplicate, confirmHigherAmount }),
    )
  }

  // What the amount typed in the dialog does to the sale (the rule is in lib/do-split.ts, enforced again on the server).
  const typedAmount = Number(doAmount)
  const splitPreview =
    row.financeAmount !== null && doAmount !== "" && Number.isFinite(typedAmount) ? planDoSplit(row.financeAmount, typedAmount) : null

  const needsOverride = !row.doNumber
  const size = compact ? "sm" : "sm"
  const btn = "h-8 text-xs"

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      {canManage && (
        <div className="flex flex-wrap gap-1.5">
          {(row.stage === "AWAITING_DO" || row.stage === "DO_RECEIVED" || row.stage === "DELIVERED") && (
            <Button type="button" size={size} variant={row.stage === "AWAITING_DO" ? "default" : "outline"} className={btn} onClick={() => openDialog("do")} data-testid="record-do">
              {row.doNumber ? "Edit DO" : "Record DO"}
            </Button>
          )}
          {row.stage === "DO_RECEIVED" && (
            <Button type="button" size={size} className={btn} onClick={() => openDialog("deliver")} data-testid="mark-delivered">
              <Truck className="size-3.5" /> Mark delivered
            </Button>
          )}
          {row.stage === "DELIVERED" && (
            <Button type="button" size={size} className={btn} onClick={() => openDialog("claim")} data-testid="submit-claim">
              Submit claim
            </Button>
          )}
          {row.stage === "CLAIM_SUBMITTED" && (
            <Button type="button" size={size} variant="outline" className={btn} onClick={() => openDialog("withdraw")} data-testid="withdraw-claim">
              Withdraw claim
            </Button>
          )}
          {/* An override, so it is not a main button: only people allowed to override (and the owner) see this menu. */}
          {row.stage === "AWAITING_DO" && canOverride && !row.deliveredAt && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="More actions" data-testid="row-menu">
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openDialog("deliver")} data-testid="override-delivery">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <span>Override: deliver without DO...</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {row.doNumber && <DoScanControl saleId={row.saleId} scanName={row.scanName} canManage={canManage} />}

      <Dialog open={open !== null} onOpenChange={(next) => !busy && !next && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {open === "do" && (
            <>
              <DialogHeader>
                <DialogTitle>Delivery Order for {row.invoiceNumber}</DialogTitle>
                <DialogDescription>
                  Issued by {row.financeCompany}
                  {row.financeOffice ? ` (${row.financeOffice})` : ""} for {row.customerName}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="do-number">DO number (from finance company)</Label>
                  <Input id="do-number" value={doNumber} onChange={(e) => setDoNumber(e.target.value)} placeholder="Optional" />
                  <p className="text-[11px] text-muted-foreground">
                    {row.doNumberInternal
                      ? `${row.doNumber} is an internal reference. Type the finance company's number here when it arrives.`
                      : "Leave empty if the number is not known yet: an internal reference (DO-0001) is used and marked internal."}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="do-date">DO date</Label>
                  <Input id="do-date" type="date" value={doDate} onChange={(e) => setDoDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="do-amount">DO amount (Rs.)</Label>
                  <Input id="do-amount" type="number" min={0} step="0.01" value={doAmount} onChange={(e) => setDoAmount(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">
                    {row.doAmount === null && row.financeAmount !== null ? "Filled in from the sale's finance amount. " : ""}Change it if the DO letter shows a different amount.
                  </p>
                  {row.financeAmount !== null && (
                    <p className="text-[11px] text-muted-foreground" data-testid="sale-finance-amount">
                      Sale finance amount: {formatLKR(row.financeAmount)}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="do-expiry">Expiry date (optional)</Label>
                  <Input id="do-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="do-office">Finance office (from the sale)</Label>
                  <Input id="do-office" value={office} onChange={(e) => setOffice(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="do-notes">Notes (optional)</Label>
                  <Textarea id="do-notes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              {splitPreview?.kind === "LOWER" && row.financeAmount !== null && (
                <div data-testid="split-lower" className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-semibold">The DO is lower than the sale&apos;s finance amount ({formatLKR(row.financeAmount)}).</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    <li>The finance company owes {formatLKR(splitPreview.financeAmount)} (the DO amount).</li>
                    <li>The customer owes {formatLKR(splitPreview.additionalDownPaymentDue)} more as an additional down payment
                      {row.saleDownPayment !== null && <> (down payment {formatLKR(row.saleDownPayment)} becomes {formatLKR(requiredDownPayment(row.saleDownPayment, splitPreview.additionalDownPaymentDue))})</>}.</li>
                    <li>The bike price does not change.</li>
                  </ul>
                </div>
              )}
              {splitPreview?.kind === "HIGHER" && row.financeAmount !== null && (
                <p data-testid="split-higher" className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-300">
                  The DO amount is higher than the sale&apos;s finance amount ({formatLKR(row.financeAmount)}). Only the owner can confirm this. It is saved as a
                  note and the sale split is not changed.
                </p>
              )}
              {error && <p role="alert" data-testid="documents-error" className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600">{error}</p>}
              {higherWarning && (
                <p role="alert" data-testid="do-higher-warning" className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-700 dark:text-red-300">
                  {higherWarning}
                </p>
              )}
              {duplicateWarning && (
                <p role="alert" data-testid="do-duplicate-warning" className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-sm text-amber-800 dark:text-amber-300">
                  {duplicateWarning}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(null)}>Cancel</Button>
                {duplicateWarning && (
                  <Button type="button" variant="outline" disabled={busy} data-testid="confirm-do-duplicate" onClick={() => saveDo(true)}>
                    Save anyway
                  </Button>
                )}
                {higherWarning && (
                  <Button type="button" variant="destructive" disabled={busy} data-testid="confirm-do-higher" onClick={() => saveDo(Boolean(duplicateWarning), true)}>
                    Owner: confirm higher amount
                  </Button>
                )}
                <Button type="button" disabled={busy} data-testid="confirm-do" onClick={() => saveDo(false)}>
                  {busy && <LoaderCircle className="size-4 animate-spin" />} Save DO
                </Button>
              </DialogFooter>
            </>
          )}

          {open === "deliver" && (
            <>
              <DialogHeader>
                <DialogTitle>{needsOverride ? "Deliver without a Delivery Order" : "Mark delivered"}</DialogTitle>
                <DialogDescription>
                  {needsOverride
                    ? "This finance sale has no Delivery Order yet. Only the owner (or someone allowed to override) can deliver it; the reason is recorded in the audit log."
                    : `Bike handed to ${row.customerName} against DO ${row.doNumber}.`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="delivered-at">Delivery date</Label>
                  <Input id="delivered-at" type="date" value={deliveredAt} onChange={(e) => setDeliveredAt(e.target.value)} />
                </div>
                {needsOverride && (
                  <div className="space-y-1.5">
                    <Label htmlFor="override-reason">Reason (required)</Label>
                    <Textarea id="override-reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is the bike being delivered before the DO?" />
                  </div>
                )}
                {error && <p role="alert" data-testid="documents-error" className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600">{error}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(null)}>Cancel</Button>
                <Button type="button" disabled={busy} data-testid="confirm-delivered" onClick={() => run(() => markDelivered({ saleId: row.saleId, deliveredAt, overrideReason: reason }))}>
                  {busy && <LoaderCircle className="size-4 animate-spin" />} {needsOverride ? "Deliver (override)" : "Mark delivered"}
                </Button>
              </DialogFooter>
            </>
          )}

          {open === "claim" && (
            <>
              <DialogHeader>
                <DialogTitle>Submit claim to {row.financeCompany}</DialogTitle>
                <DialogDescription>Tick what was handed in with the claim for {row.invoiceNumber}.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="claim-date">Date submitted</Label>
                  <Input id="claim-date" type="date" value={claimDate} onChange={(e) => setClaimDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="claim-ref">Reference (optional)</Label>
                  <Input id="claim-ref" maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>
                <fieldset className="space-y-1.5">
                  <legend className="text-sm font-medium">Documents submitted</legend>
                  {CLAIM_CHECKLIST.map(({ key, label }) => (
                    <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={checklist[key]} onChange={(e) => setChecklist((c) => ({ ...c, [key]: e.target.checked }))} />
                      {label}
                    </label>
                  ))}
                </fieldset>
                {error && <p role="alert" data-testid="documents-error" className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600">{error}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(null)}>Cancel</Button>
                <Button type="button" disabled={busy} data-testid="confirm-claim" onClick={() => run(() => submitClaim({ saleId: row.saleId, submittedAt: claimDate, reference, checklist }))}>
                  {busy && <LoaderCircle className="size-4 animate-spin" />} Record claim
                </Button>
              </DialogFooter>
            </>
          )}

          {open === "withdraw" && (
            <>
              <DialogHeader>
                <DialogTitle>Withdraw the claim?</DialogTitle>
                <DialogDescription>The sale goes back to &quot;Delivered, claim not submitted&quot;. The reason is recorded in the audit log.</DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="withdraw-reason">Reason (required)</Label>
                <Textarea id="withdraw-reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              {error && <p role="alert" data-testid="documents-error" className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(null)}>Cancel</Button>
                <Button type="button" variant="destructive" disabled={busy} data-testid="confirm-withdraw" onClick={() => run(() => withdrawClaim({ saleId: row.saleId, reason }))}>
                  {busy && <LoaderCircle className="size-4 animate-spin" />} Withdraw claim
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
