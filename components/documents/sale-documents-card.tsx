"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, FileText, LoaderCircle, Truck } from "lucide-react"
import { markDelivered, type SaleDocuments } from "@/app/actions/documents"
import { DeliveryOrderActions } from "@/components/documents/delivery-order-actions"
import { StageBadge } from "@/components/documents/delivery-orders-view"
import { RmvHandoverPanel } from "@/components/documents/rmv-handover-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatLKR } from "@/lib/currency"
import { RMV_STAGE_LABELS } from "@/lib/documents"

/** "Documents" card on the sale page: delivery (Delivery Order for finance sales) and RMV documents, with quick actions. */
export function SaleDocumentsCard({ docs }: { docs: SaleDocuments }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState(() => new Date().toLocaleDateString("en-CA"))
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const row = docs.deliveryOrder

  async function deliverCashSale() {
    setBusy(true)
    setError(null)
    const result = await markDelivered({ saleId: docs.saleId, deliveredAt: date })
    setBusy(false)
    if (result.success) {
      toast.success(result.message ?? "Marked as delivered.")
      setOpen(false)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <Card className="border-border/60 bg-card/60 shadow-sm backdrop-blur print:hidden" data-testid="sale-documents-card">
      <CardHeader className="border-b border-border/40 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <FileText className="size-4 text-primary" /> Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        {/* Delivery */}
        <section className="space-y-2" data-testid="documents-delivery">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {docs.isFinance ? "Delivery Order" : "Delivery"}
            </p>
            {row && <StageBadge stage={row.stage} />}
          </div>

          {docs.isFinance && row ? (
            <>
              <div className="space-y-0.5 text-xs text-muted-foreground">
                <p>
                  {row.financeCompany}
                  {row.financeOffice ? ` · ${row.financeOffice}` : ""}
                </p>
                {row.doNumber ? (
                  <p>
                    DO <span className="font-medium text-foreground">{row.doNumber}</span>
                    {row.doNumberInternal && <span className="ml-1 rounded border border-amber-500/40 bg-amber-500/10 px-1 text-[10px] font-semibold uppercase text-amber-700">internal</span>} · {row.doDate}
                    {docs.canSeeAmounts && row.doAmount !== null ? ` · ${formatLKR(row.doAmount)}` : ""}
                    {row.expiryDate ? ` · expires ${row.expiryDate}` : ""}
                  </p>
                ) : (
                  <p>No Delivery Order recorded yet.</p>
                )}
                {row.deliveredAt && <p>Delivered {row.deliveredAt}{row.deliveredByName ? ` by ${row.deliveredByName}` : ""}</p>}
                {row.claim && <p>Claim submitted {row.claim.submittedAt}{row.claim.reference ? ` · ${row.claim.reference}` : ""}</p>}
                {row.paidAt && <p className="text-emerald-600">Paid {row.paidAt}</p>}
                {row.stage !== "PAID" && <p>{row.agingDays} day(s) in this stage</p>}
                {row.warnings.map((warning) => (
                  <p key={warning} className="flex items-start gap-1 text-amber-700 dark:text-amber-400" data-testid="do-warning">
                    <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {warning}
                  </p>
                ))}
              </div>
              <DeliveryOrderActions row={row} canManage={docs.canManage} canOverride={docs.canOverride} />
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {docs.deliveredAt ? `Delivered ${docs.deliveredAt}${docs.deliveredByName ? ` by ${docs.deliveredByName}` : ""}` : "Delivery not marked yet."}
              </p>
              {docs.canManage && (
                <Button type="button" size="sm" variant={docs.deliveredAt ? "ghost" : "default"} className="h-8 text-xs" onClick={() => setOpen(true)} data-testid="mark-cash-delivered">
                  <Truck className="size-3.5" /> {docs.deliveredAt ? "Change date" : "Mark delivered"}
                </Button>
              )}
            </div>
          )}
        </section>

        {/* RMV documents */}
        <section className="space-y-2" data-testid="documents-rmv">
          {docs.rmv ? (
            <>
              <p className="text-xs text-muted-foreground">
                RMV documents: <span className="font-medium text-foreground">{RMV_STAGE_LABELS[docs.rmv.stage]}</span>
              </p>
              <RmvHandoverPanel saleId={docs.saleId} info={docs.rmv} canManage={docs.canManage} />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No RMV record for this sale.</p>
          )}
        </section>
      </CardContent>

      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark delivered</DialogTitle>
            <DialogDescription>When the bike was handed to the customer ({docs.invoiceNumber}).</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cash-delivered-at">Delivery date</Label>
            <Input id="cash-delivered-at" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {error && <p role="alert" data-testid="documents-error" className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" disabled={busy} onClick={deliverCashSale} data-testid="confirm-cash-delivered">
              {busy && <LoaderCircle className="size-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
