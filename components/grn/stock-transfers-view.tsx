"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Truck } from "lucide-react"
import { toast } from "sonner"
import {
  cancelStockTransfer,
  dispatchStockTransfer,
  receiveStockTransfer,
  type StockTransferRow,
  type TransferOptions,
} from "@/app/actions/stock-transfers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"

const STATUS_LABEL: Record<StockTransferRow["status"], string> = {
  IN_TRANSIT: "In transit",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" })

export function StockTransfersView({ transfers, options }: { transfers: StockTransferRow[]; options: TransferOptions }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  // ---- dispatch dialog
  const [dispatchOpen, setDispatchOpen] = React.useState(false)
  const [fromBranchId, setFromBranchId] = React.useState(options.fromBranchIds[0] ?? "")
  const [toBranchId, setToBranchId] = React.useState("")
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [notes, setNotes] = React.useState("")
  const availableBikes = options.bikes.filter((b) => b.branchId === fromBranchId)

  function openDispatch() {
    setFromBranchId(options.fromBranchIds[0] ?? "")
    setToBranchId("")
    setSelected(new Set())
    setNotes("")
    setDispatchOpen(true)
  }

  function toggleBike(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function dispatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await dispatchStockTransfer({ fromBranchId, toBranchId, vehicleIds: [...selected], notes })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setDispatchOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not dispatch the transfer.")
    } finally {
      setBusy(false)
    }
  }

  // ---- receive / cancel dialogs
  const [receiving, setReceiving] = React.useState<StockTransferRow | null>(null)
  const [cancelling, setCancelling] = React.useState<StockTransferRow | null>(null)
  const [reason, setReason] = React.useState("")

  async function run(action: () => ReturnType<typeof receiveStockTransfer>, after: () => void) {
    setBusy(true)
    try {
      const result = await action()
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      after()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.")
    } finally {
      setBusy(false)
    }
  }

  const inTransitCount = transfers.filter((t) => t.status === "IN_TRANSIT").length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock Transfers</h1>
          <p className="text-sm text-muted-foreground">
            Move bikes between showrooms. A dispatched bike leaves the source stock, cannot be sold while in transit, and
            joins the destination stock when it is received.
          </p>
        </div>
        <Button onClick={openDispatch}>
          <Truck className="size-4" /> New transfer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfers</CardTitle>
          <CardDescription>{inTransitCount} in transit</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer</TableHead>
                <TableHead>Dispatched</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Bikes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No transfers yet.
                  </TableCell>
                </TableRow>
              )}
              {transfers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono font-semibold">{t.transferNumber}</TableCell>
                  <TableCell className="text-xs">
                    {formatDate(t.dispatchedAt)}
                    <div className="text-muted-foreground">by {t.dispatchedByName}</div>
                  </TableCell>
                  <TableCell>{t.fromBranch.name}</TableCell>
                  <TableCell>{t.toBranch.name}</TableCell>
                  <TableCell className="text-xs">
                    {t.bikes.map((b) => (
                      <div key={b.id} className="font-mono">
                        {b.chassisNumber}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.status === "CANCELLED" ? "destructive" : t.status === "RECEIVED" ? "default" : "secondary"}>
                      {STATUS_LABEL[t.status]}
                    </Badge>
                    {t.status === "RECEIVED" && t.receivedAt && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDate(t.receivedAt)} by {t.receivedByName}
                      </div>
                    )}
                    {t.status === "CANCELLED" && t.cancelledAt && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDate(t.cancelledAt)} by {t.cancelledByName}
                        {t.cancelReason ? `: ${t.cancelReason}` : ""}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    {t.canReceive && (
                      <Button size="sm" onClick={() => setReceiving(t)}>
                        Receive
                      </Button>
                    )}
                    {t.canCancel && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCancelling(t)
                          setReason("")
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dispatch stock transfer</DialogTitle>
            <DialogDescription>Choose where the bikes are going and which bikes to send.</DialogDescription>
          </DialogHeader>
          <form onSubmit={dispatch} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="xfer-from">From branch</Label>
                <select
                  id="xfer-from"
                  className={selectClass}
                  value={fromBranchId}
                  disabled={options.fromBranchIds.length <= 1}
                  onChange={(e) => {
                    setFromBranchId(e.target.value)
                    setSelected(new Set())
                  }}
                >
                  {options.branches
                    .filter((b) => options.fromBranchIds.includes(b.id))
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="xfer-to">To branch</Label>
                <select id="xfer-to" className={selectClass} value={toBranchId} onChange={(e) => setToBranchId(e.target.value)} required>
                  <option value="">Select branch</option>
                  {options.branches
                    .filter((b) => b.id !== fromBranchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Bikes in stock at the source branch ({selected.size} selected)</legend>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                {availableBikes.length === 0 && <p className="p-2 text-sm text-muted-foreground">No bikes in stock at this branch.</p>}
                {availableBikes.map((bike) => (
                  <label key={bike.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={selected.has(bike.id)}
                      onChange={(e) => toggleBike(bike.id, e.target.checked)}
                      aria-label={bike.chassisNumber}
                    />
                    <span className="font-mono">{bike.chassisNumber}</span>
                    <span className="text-muted-foreground">{bike.model}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="xfer-notes">Notes</Label>
              <Input id="xfer-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDispatchOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={busy || !toBranchId || selected.size === 0}>
                {busy && <LoaderCircle className="size-4 animate-spin" />} Dispatch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receiving} onOpenChange={(open) => !open && setReceiving(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receive transfer {receiving?.transferNumber}</DialogTitle>
            <DialogDescription>
              {receiving?.bikes.length} bike(s) from {receiving?.fromBranch.name} will join {receiving?.toBranch.name}&apos;s stock.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiving(null)}>
              Close
            </Button>
            <Button
              disabled={busy}
              onClick={() => receiving && run(() => receiveStockTransfer({ transferId: receiving.id }), () => setReceiving(null))}
            >
              {busy && <LoaderCircle className="size-4 animate-spin" />} Confirm receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelling} onOpenChange={(open) => !open && setCancelling(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel transfer {cancelling?.transferNumber}</DialogTitle>
            <DialogDescription>The bikes go back into {cancelling?.fromBranch.name}&apos;s stock.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="xfer-reason">Reason (optional)</Label>
            <Input id="xfer-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>
              Keep transfer
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                cancelling && run(() => cancelStockTransfer({ transferId: cancelling.id, reason }), () => setCancelling(null))
              }
            >
              {busy && <LoaderCircle className="size-4 animate-spin" />} Confirm cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
