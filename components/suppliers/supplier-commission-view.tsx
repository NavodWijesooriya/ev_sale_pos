"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, Copy, Download, Handshake, Lock, LockOpen, LoaderCircle, Undo2 } from "lucide-react"
import {
  closeSupplierMonth,
  copyLastMonthTargets,
  markSupplierCommissionReceived,
  reopenSupplierMonth,
  setSupplierTarget,
  undoSupplierCommissionReceived,
  type SupplierCommissionReport,
  type SupplierCommissionRow,
} from "@/app/actions/supplier-commission"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { downloadCsv } from "@/lib/csv"
import { formatLKR } from "@/lib/currency"

/** Owner-only: monthly supplier targets, the commission each supplier owes, closing a month and recording receipts. */
export function SupplierCommissionView({ report }: { report: SupplierCommissionReport }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState<string | null>(null)
  const [receiveFor, setReceiveFor] = React.useState<SupplierCommissionRow | null>(null)
  const [receivedDate, setReceivedDate] = React.useState(() => new Date().toLocaleDateString("en-CA"))
  const [reference, setReference] = React.useState("")
  const [receiveError, setReceiveError] = React.useState<string | null>(null)
  const [confirmReopen, setConfirmReopen] = React.useState(false)
  const [confirmClose, setConfirmClose] = React.useState(false)
  const closed = Boolean(report.closed)

  async function run(label: string, action: () => Promise<{ success: boolean; error?: string; message?: string }>) {
    setBusy(label)
    const result = await action()
    setBusy(null)
    if (result.success) {
      if (result.message) toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.error ?? "Something went wrong.")
    }
    return result.success
  }

  async function saveTarget(row: SupplierCommissionRow, raw: string) {
    const value = raw.trim() === "" ? 0 : Number(raw)
    if (!Number.isInteger(value) || value < 0) return toast.error("The target must be a whole number of bikes (0 or more).")
    if (value === row.targetUnits) return
    await run(`target-${row.supplierId}`, () => setSupplierTarget({ supplierId: row.supplierId, month: report.month, targetUnits: value }))
  }

  async function submitReceived() {
    if (!receiveFor) return
    setReceiveError(null)
    setBusy("received")
    const result = await markSupplierCommissionReceived({
      supplierId: receiveFor.supplierId,
      month: report.month,
      receivedAt: receivedDate,
      reference,
    })
    setBusy(null)
    if (result.success) {
      toast.success(result.message)
      setReceiveFor(null)
      router.refresh()
    } else {
      setReceiveError(result.error)
    }
  }

  function exportCsv() {
    downloadCsv(`supplier_commission_${report.month}.csv`, [
      ["Month", "Supplier", "Target (bikes)", "Units sold", "Achievement %", "Slab", "Per unit (Rs.)", "Total commission (Rs.)", "Status", "Received on", "Reference"],
      ...report.rows.map((row) => [
        report.month,
        row.supplierName,
        row.targetUnits,
        row.unitsSold,
        row.achievementPercent,
        row.slabText,
        row.amountPerUnit,
        row.totalCommission,
        closed ? "Closed" : "Open",
        row.received ? row.received.receivedAt.slice(0, 10) : "",
        row.received?.reference ?? "",
      ]),
      ["", "TOTAL", report.totals.targetUnits, report.totals.unitsSold, "", "", "", report.totals.commission, "", "", ""],
    ])
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 hidden size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
            <Handshake className="size-5" />
          </span>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Supplier Commission</h1>
            <p className="text-sm text-muted-foreground">
              What each supplier owes the dealership for hitting its monthly target. Owner only; slabs are in Settings.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="commission-month" className="text-xs">
              Month
            </Label>
            <Input
              id="commission-month"
              type="month"
              className="w-44"
              value={report.month}
              onChange={(event) => event.target.value && router.push(`/dashboard/suppliers/commission?month=${event.target.value}`)}
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={exportCsv} data-testid="export-supplier-commission">
            <Download className="size-3.5" /> CSV
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              {report.monthLabel}
              {closed ? (
                <span data-testid="month-closed-badge" className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <Lock className="size-3" /> Closed
                </span>
              ) : (
                <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Open</span>
              )}
            </CardTitle>
            <CardDescription>
              Units sold = completed sales of bikes from that supplier (cancelled sales are not counted). Achievement = units sold ÷ target.
              {closed && report.closed && (
                <>
                  {" "}
                  Closed on {report.closed.closedAt.slice(0, 10)}
                  {report.closed.closedByName ? ` by ${report.closed.closedByName}` : ""}: later changes to slabs, targets or sales do not alter it.
                </>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {!closed && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!report.canCopyPrevious || busy !== null}
                onClick={() => run("copy", () => copyLastMonthTargets(report.month))}
                data-testid="copy-targets"
              >
                {busy === "copy" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
                Copy last month&apos;s targets
              </Button>
            )}
            {closed ? (
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setConfirmReopen(true)} data-testid="reopen-month">
                <LockOpen className="size-3.5" /> Reopen month
              </Button>
            ) : (
              <Button type="button" size="sm" className="gap-1.5" disabled={report.isFuture || busy !== null} onClick={() => setConfirmClose(true)} data-testid="close-month">
                <Lock className="size-3.5" /> Close month
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table data-testid="supplier-commission-table">
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Target (bikes)</TableHead>
                <TableHead className="text-right">Units sold</TableHead>
                <TableHead className="text-right">Achievement</TableHead>
                <TableHead>Slab paid</TableHead>
                <TableHead className="text-right">Total commission</TableHead>
                <TableHead className="text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {closed ? "No supplier had a target or sales this month." : "No suppliers yet. Add suppliers under Supplier Management."}
                  </TableCell>
                </TableRow>
              )}
              {report.rows.map((row) => (
                <TableRow key={row.supplierId} data-testid="supplier-commission-row">
                  <TableCell className="font-medium">{row.supplierName}</TableCell>
                  <TableCell className="text-right">
                    {closed ? (
                      row.targetUnits
                    ) : (
                      <Input
                        key={`${row.supplierId}-${row.targetUnits}`}
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        aria-label={`Target for ${row.supplierName}`}
                        defaultValue={row.targetUnits || ""}
                        placeholder="-"
                        className="ml-auto h-8 w-24 text-right"
                        disabled={busy !== null}
                        onBlur={(event) => saveTarget(row, event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right">{row.unitsSold}</TableCell>
                  <TableCell className="text-right">{row.targetUnits > 0 ? `${row.achievementPercent}%` : "No target"}</TableCell>
                  <TableCell className="text-muted-foreground">{row.slabText}</TableCell>
                  <TableCell className="text-right font-semibold">{formatLKR(row.totalCommission)}</TableCell>
                  <TableCell className="text-right">
                    {row.received ? (
                      <div className="flex flex-col items-end gap-0.5 text-xs">
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" /> Received {row.received.receivedAt.slice(0, 10)}
                        </span>
                        {row.received.reference && <span className="text-muted-foreground">Ref {row.received.reference}</span>}
                        {row.received.amount !== row.totalCommission && (
                          <span className="text-amber-600">Received {formatLKR(row.received.amount)}; figure changed</span>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => run(`undo-${row.supplierId}`, () => undoSupplierCommissionReceived({ supplierId: row.supplierId, month: report.month }))}
                        >
                          <Undo2 className="size-3" /> Undo
                        </button>
                      </div>
                    ) : row.totalCommission > 0 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReceiveFor(row)
                          setReference("")
                          setReceiveError(null)
                        }}
                      >
                        Mark received
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {report.rows.length > 0 && (
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{report.totals.targetUnits}</TableCell>
                  <TableCell className="text-right">{report.totals.unitsSold}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right" data-testid="commission-total">
                    {formatLKR(report.totals.commission)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-normal text-muted-foreground">{formatLKR(report.totals.received)} received</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-4 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">{closed ? "Slabs used when this month was closed" : "Current slabs"}</p>
            <p>
              {report.slabs.length === 0
                ? "None"
                : report.slabs.map((slab) => `${slab.fromPercent}%+ → Rs. ${slab.amountPerUnit.toLocaleString("en-LK")}`).join("  ·  ")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(receiveFor)} onOpenChange={(open) => !open && busy !== "received" && setReceiveFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark commission received</DialogTitle>
            <DialogDescription>
              {receiveFor?.supplierName}: {receiveFor ? formatLKR(receiveFor.totalCommission) : ""} for {report.monthLabel}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="received-date">Date received</Label>
              <Input id="received-date" type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="received-ref">Reference (cheque / transfer no.)</Label>
              <Input id="received-ref" maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} />
            </div>
            {receiveError && <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600">{receiveError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReceiveFor(null)} disabled={busy === "received"}>
              Cancel
            </Button>
            <Button type="button" onClick={submitReceived} disabled={busy === "received"} data-testid="confirm-received">
              {busy === "received" && <LoaderCircle className="size-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close {report.monthLabel}?</DialogTitle>
            <DialogDescription>
              The figures and the slabs used are saved. Later changes to slabs, targets or sales will not alter this month. You can reopen it if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmClose(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              data-testid="confirm-close-month"
              disabled={busy !== null}
              onClick={async () => {
                if (await run("close", () => closeSupplierMonth(report.month))) setConfirmClose(false)
              }}
            >
              {busy === "close" && <LoaderCircle className="size-4 animate-spin" />} Close month
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReopen} onOpenChange={setConfirmReopen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reopen {report.monthLabel}?</DialogTitle>
            <DialogDescription>
              The saved snapshot is deleted and the month is calculated live again with today&apos;s slabs, targets and sales. The reopening is recorded in the audit log.
              Received records are kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmReopen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-testid="confirm-reopen-month"
              disabled={busy !== null}
              onClick={async () => {
                if (await run("reopen", () => reopenSupplierMonth(report.month))) setConfirmReopen(false)
              }}
            >
              {busy === "reopen" && <LoaderCircle className="size-4 animate-spin" />} Reopen month
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
