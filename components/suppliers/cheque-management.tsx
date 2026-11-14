"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import {
  bounceCheque,
  cancelCheque,
  clearCheque,
  markChequePresented,
  type ChequeRow,
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
import { formatDate, formatMoney, nativeSelectClass, StatusBadge, todayISO } from "./shared"

type Filter = "ALL" | "ACTIVE" | "CLEARED" | "BOUNCED" | "CANCELLED"

const ACTIVE = ["PENDING", "ISSUED", "PRESENTED"]
const isActive = (status: string) => ACTIVE.includes(status)

export function ChequeManagement({ cheques }: { cheques: ChequeRow[] }) {
  const router = useRouter()
  const [filter, setFilter] = React.useState<Filter>("ACTIVE")
  const [cancelling, setCancelling] = React.useState<ChequeRow | null>(null)
  const [clearing, setClearing] = React.useState<ChequeRow | null>(null)
  const [clearedDate, setClearedDate] = React.useState(todayISO())
  const [bouncing, setBouncing] = React.useState<ChequeRow | null>(null)
  const [reason, setReason] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const rows = cheques.filter((c) =>
    filter === "ALL" ? true : filter === "ACTIVE" ? isActive(c.status) : c.status === filter,
  )
  const pendingTotal = cheques.filter((c) => isActive(c.status)).reduce((s, c) => s + c.amount, 0)
  const today = todayISO()

  async function run(action: () => Promise<{ success: boolean; message: string }>, done: () => void) {
    setBusy(true)
    try {
      const result = await action()
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      done()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cheque Management</h1>
        <p className="text-sm text-muted-foreground">
          Cheques issued to suppliers. A bounced cheque automatically reverses its payment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Issued cheques</CardTitle>
          <CardDescription>Pending cheques value: {formatMoney(pendingTotal)}</CardDescription>
          <select
            aria-label="Filter by status"
            className={`${nativeSelectClass} mt-2 sm:w-48`}
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
          >
            <option value="ACTIVE">Awaiting clearance</option>
            <option value="CLEARED">Cleared</option>
            <option value="BOUNCED">Bounced</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="ALL">All</option>
          </select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cheque no.</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Cheque date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No cheques found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((c) => {
                const due = isActive(c.status) && c.chequeDate.slice(0, 10) <= today
                const canPresent = c.status === "PENDING" || c.status === "ISSUED"
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.chequeNumber}</TableCell>
                    <TableCell>{c.supplierName}</TableCell>
                    <TableCell>{c.bankName}</TableCell>
                    <TableCell>
                      {formatDate(c.chequeDate)}
                      {due && <span className="ml-2 text-xs font-medium text-amber-600">Due</span>}
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(c.amount)}</TableCell>
                    <TableCell>{c.paymentNumber}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                      {(c.status === "BOUNCED" || c.status === "CANCELLED") && c.bounceReason && (
                        <p className="mt-1 text-xs text-muted-foreground">{c.bounceReason}</p>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {isActive(c.status) && (
                        <>
                          {canPresent && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => run(() => markChequePresented({ chequeId: c.id }), () => undefined)}
                            >
                              Presented
                            </Button>
                          )}
                          {canPresent && (
                            <Button size="sm" variant="outline" onClick={() => { setCancelling(c); setReason("") }}>
                              Cancel
                            </Button>
                          )}
                          <Button size="sm" onClick={() => { setClearing(c); setClearedDate(todayISO()) }}>
                            Clear
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { setBouncing(c); setReason("") }}>
                            Bounced
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!clearing} onOpenChange={(open) => !open && setClearing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark cheque {clearing?.chequeNumber} as cleared</DialogTitle>
            <DialogDescription>
              {clearing && `${formatMoney(clearing.amount)} to ${clearing.supplierName}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cleared-date">Cleared date</Label>
            <Input id="cleared-date" type="date" value={clearedDate} onChange={(e) => setClearedDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearing(null)}>Cancel</Button>
            <Button
              disabled={busy || !clearedDate}
              onClick={() =>
                clearing && run(() => clearCheque({ chequeId: clearing.id, clearedDate }), () => setClearing(null))
              }
            >
              {busy && <LoaderCircle className="size-4 animate-spin" />} Confirm cleared
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelling} onOpenChange={(open) => !open && setCancelling(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel cheque {cancelling?.chequeNumber}</DialogTitle>
            <DialogDescription>
              Use this for a cheque that was never presented. The payment is reversed and the amount returns to the
              outstanding balance of the GRNs it was applied to. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason (optional)</Label>
            <Input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>Keep cheque</Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                cancelling && run(() => cancelCheque({ chequeId: cancelling.id, reason }), () => setCancelling(null))
              }
            >
              {busy && <LoaderCircle className="size-4 animate-spin" />} Cancel cheque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!bouncing} onOpenChange={(open) => !open && setBouncing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark cheque {bouncing?.chequeNumber} as bounced</DialogTitle>
            <DialogDescription>
              The payment will be reversed: the amount returns to the outstanding balance of the GRNs it was applied to,
              and any advance it created is voided. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bounce-reason">Reason (optional)</Label>
            <Input id="bounce-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBouncing(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                bouncing && run(() => bounceCheque({ chequeId: bouncing.id, reason }), () => setBouncing(null))
              }
            >
              {busy && <LoaderCircle className="size-4 animate-spin" />} Confirm bounced
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
