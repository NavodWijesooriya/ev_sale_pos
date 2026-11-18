"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { LoaderCircle, Plus } from "lucide-react"
import { toast } from "sonner"
import {
  addRmvCommission,
  updateCommissionSettlement,
  type SettlementLine,
  type SettlementTypeKey,
} from "@/app/actions/commission-settlement"
import { Badge } from "@/components/ui/badge"
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
import { downloadCsv } from "@/lib/csv"
import { colomboDateKey } from "@/lib/dates"

const TYPE_LABEL: Record<SettlementTypeKey, string> = {
  FINANCE: "Finance / Leasing",
  INSURANCE: "Insurance",
  RMV: "RMV",
}

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 dark:bg-input/30"

const money = (n: number) =>
  `Rs. ${new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`

interface Props {
  lines: SettlementLine[]
  pendingTotal: number
  settledTotal: number
  initialType: string
  initialStatus: string
}

/** Owner-only: settle finance / insurance / RMV commissions line by line. */
export function CommissionSettlementPanel({ lines, pendingTotal, settledTotal, initialType, initialStatus }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [editing, setEditing] = React.useState<SettlementLine | null>(null)
  const [status, setStatus] = React.useState<"PENDING" | "SETTLED">("SETTLED")
  const [settledDate, setSettledDate] = React.useState("")
  const [reference, setReference] = React.useState("")
  const [rmvAmount, setRmvAmount] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [rmvOpen, setRmvOpen] = React.useState(false)
  const [rmvInvoice, setRmvInvoice] = React.useState("")
  const [rmvNewAmount, setRmvNewAmount] = React.useState("")

  function setFilter(key: "stype" | "sstatus", value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  function openEdit(line: SettlementLine) {
    setEditing(line)
    setStatus(line.status === "SETTLED" ? "PENDING" : "SETTLED")
    setSettledDate(line.settledAt ? colomboDateKey(new Date(line.settledAt)) : colomboDateKey(new Date()))
    setReference(line.reference ?? "")
    setRmvAmount(String(line.amount))
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      const result = await updateCommissionSettlement({
        saleId: editing.saleId,
        type: editing.type,
        status,
        settledDate: status === "SETTLED" ? settledDate : "",
        reference,
        amount: editing.type === "RMV" ? Number(rmvAmount) : undefined,
      })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setEditing(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update.")
    } finally {
      setSaving(false)
    }
  }

  async function addRmv(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await addRmvCommission({ invoiceNumber: rmvInvoice, amount: Number(rmvNewAmount) })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success("RMV commission added as pending.")
      setRmvOpen(false)
      setRmvInvoice("")
      setRmvNewAmount("")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  function exportLines() {
    downloadCsv(`commission_settlements_${colomboDateKey(new Date())}.csv`, [
      ["Sale Date", "Invoice", "Customer", "Commission Type", "Amount (Rs.)", "Status", "Settled On", "Reference"],
      ...lines.map((l) => [
        colomboDateKey(new Date(l.saleDate)),
        l.invoiceNumber,
        l.customerName,
        TYPE_LABEL[l.type],
        l.amount,
        l.status,
        l.settledAt ? colomboDateKey(new Date(l.settledAt)) : "",
        l.reference ?? "",
      ]),
    ])
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Commission settlement</CardTitle>
            <CardDescription>
              Mark each commission as pending or settled, separately for finance, insurance and RMV.
              Pending {money(pendingTotal)} · Settled {money(settledTotal)} (for the lines shown)
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Commission type"
              className={selectClass}
              value={initialType}
              onChange={(e) => setFilter("stype", e.target.value)}
            >
              <option value="">All types</option>
              <option value="FINANCE">Finance / Leasing</option>
              <option value="INSURANCE">Insurance</option>
              <option value="RMV">RMV</option>
            </select>
            <select
              aria-label="Settlement status"
              className={selectClass}
              value={initialStatus}
              onChange={(e) => setFilter("sstatus", e.target.value)}
            >
              <option value="">Pending and settled</option>
              <option value="PENDING">Pending</option>
              <option value="SETTLED">Settled</option>
            </select>
            <Button type="button" size="sm" variant="outline" onClick={() => setRmvOpen(true)}>
              <Plus className="size-3.5" /> RMV commission
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={exportLines} disabled={lines.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale date</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Settled on</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  No commission lines match these filters.
                </TableCell>
              </TableRow>
            )}
            {lines.map((line) => (
              <TableRow key={line.key}>
                <TableCell>{colomboDateKey(new Date(line.saleDate))}</TableCell>
                <TableCell className="font-medium">{line.invoiceNumber}</TableCell>
                <TableCell>{line.customerName}</TableCell>
                <TableCell>{TYPE_LABEL[line.type]}</TableCell>
                <TableCell className="text-right">{money(line.amount)}</TableCell>
                <TableCell>
                  {line.status === "SETTLED" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">SETTLED</Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">PENDING</Badge>
                  )}
                </TableCell>
                <TableCell>{line.settledAt ? colomboDateKey(new Date(line.settledAt)) : "-"}</TableCell>
                <TableCell className="max-w-48 truncate" title={line.reference ?? ""}>
                  {line.reference ?? "-"}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => openEdit(line)}>
                    {line.status === "SETTLED" ? "Reopen" : "Settle"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing && `${TYPE_LABEL[editing.type]} commission · ${editing.invoiceNumber}`}
            </DialogTitle>
            <DialogDescription>{editing && `${editing.customerName} · ${money(editing.amount)}`}</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settle-status">Status</Label>
              <select
                id="settle-status"
                className={`${selectClass} w-full`}
                value={status}
                onChange={(e) => setStatus(e.target.value as "PENDING" | "SETTLED")}
              >
                <option value="SETTLED">Settled</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
            {status === "SETTLED" && (
              <div className="space-y-2">
                <Label htmlFor="settle-date">Settlement date</Label>
                <Input
                  id="settle-date"
                  type="date"
                  value={settledDate}
                  onChange={(e) => setSettledDate(e.target.value)}
                  required
                />
              </div>
            )}
            {editing?.type === "RMV" && (
              <div className="space-y-2">
                <Label htmlFor="settle-amount">RMV commission amount (Rs.)</Label>
                <Input
                  id="settle-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rmvAmount}
                  onChange={(e) => setRmvAmount(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="settle-ref">Reference / notes</Label>
              <Input
                id="settle-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={300}
                placeholder="e.g. Lb Finance remittance #1234"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <LoaderCircle className="size-4 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={rmvOpen} onOpenChange={setRmvOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add RMV commission</DialogTitle>
            <DialogDescription>
              RMV commission is not calculated automatically. Enter the invoice and the amount; it starts as pending.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addRmv} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rmv-invoice">Invoice number</Label>
              <Input id="rmv-invoice" value={rmvInvoice} onChange={(e) => setRmvInvoice(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rmv-amount">Amount (Rs.)</Label>
              <Input
                id="rmv-amount"
                type="number"
                min="0"
                step="0.01"
                value={rmvNewAmount}
                onChange={(e) => setRmvNewAmount(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRmvOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <LoaderCircle className="size-4 animate-spin" />} Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
