"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Download, FileDown, LoaderCircle, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  deleteBankDeposit,
  getBankDepositReport,
  getDepositReference,
  recordBankDeposit,
  saveBankAccount,
  type DepositOptions,
  type DepositReportRow,
} from "@/app/actions/bank-deposits"
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
import { downloadDocumentPdf } from "@/lib/download-document-pdf"

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 dark:bg-input/30"

const money = (n: number) =>
  `Rs. ${new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`

interface Props {
  options: DepositOptions
  initialRows: DepositReportRow[]
  initialTotal: number
  isOwner: boolean
  /** The signed-in staff member: saved automatically as the person who recorded the deposit. */
  staffName: string
}

export function BankDepositsView({ options, initialRows, initialTotal, isOwner, staffName }: Props) {
  const router = useRouter()
  const today = colomboDateKey(new Date())
  const activeAccounts = options.accounts.filter((a) => a.isActive)

  // ---- record form
  const [date, setDate] = React.useState(today)
  const [branchId, setBranchId] = React.useState(options.branches.length === 1 ? options.branches[0].id : "")
  const [accountId, setAccountId] = React.useState(activeAccounts[0]?.id ?? "")
  const [amount, setAmount] = React.useState("")
  const [slip, setSlip] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [reference, setReference] = React.useState<{ cashSalesTotal: number; alreadyDeposited: number; remaining: number } | null>(null)

  // Live reference for the chosen branch and day
  React.useEffect(() => {
    if (!branchId || !date) return
    let cancelled = false
    getDepositReference(branchId, date)
      .then((r) => !cancelled && setReference(r))
      .catch(() => !cancelled && setReference(null))
    return () => {
      cancelled = true
    }
  }, [branchId, date, initialTotal])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await recordBankDeposit({
        date,
        branchId,
        bankAccountId: accountId,
        amount: Number(amount),
        slipNumber: slip,
        description,
      })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setAmount("")
      setSlip("")
      setDescription("")
      setFiltered(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record the deposit.")
    } finally {
      setSaving(false)
    }
  }

  // ---- bank account dialog
  const [accountOpen, setAccountOpen] = React.useState(false)
  const [acc, setAcc] = React.useState({ bankName: "", accountNumber: "", accountName: "" })
  async function addAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await saveBankAccount(acc)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setAccountOpen(false)
      setAcc({ bankName: "", accountNumber: "", accountName: "" })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  // ---- report
  // Filtered results replace the server data until the next deposit / delete refreshes it.
  const [filtered, setFiltered] = React.useState<{ rows: DepositReportRow[]; total: number } | null>(null)
  const rows = filtered?.rows ?? initialRows
  const total = filtered?.total ?? initialTotal
  const [filters, setFilters] = React.useState({ from: "", to: "", branchId: "", bankAccountId: "", search: "" })
  const [loading, setLoading] = React.useState(false)
  const reportRef = React.useRef<HTMLDivElement>(null)

  async function applyFilters(event?: React.FormEvent) {
    event?.preventDefault()
    setLoading(true)
    try {
      const report = await getBankDepositReport(filters)
      setFiltered({ rows: report.rows, total: report.totalDeposited })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the report.")
    } finally {
      setLoading(false)
    }
  }

  function exportCsv() {
    // Exactly the rows currently shown
    downloadCsv(`bank_deposits_${today}.csv`, [
      ["Date", "Branch", "Bank", "Account", "Cash Sales That Day (Rs.)", "Deposit Amount (Rs.)", "Slip / Reference", "Description", "Recorded By"],
      ...rows.map((r) => [
        r.depositDate,
        r.branchName,
        r.bankName,
        r.accountNumber,
        r.cashSalesTotal,
        r.depositAmount,
        r.slipNumber,
        r.description ?? "",
        r.recordedBy,
      ]),
      ["", "", "", "", "TOTAL", total, "", "", ""],
    ])
  }

  async function exportPdf() {
    if (!reportRef.current) return
    try {
      await downloadDocumentPdf(reportRef.current, `bank_deposits_${today}.pdf`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the PDF.")
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this deposit record? This is logged and cannot be undone.")) return
    const result = await deleteBankDeposit(id)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    setFiltered(null)
    router.refresh()
  }

  const amountNumber = Number(amount)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Daily Bank Deposits</h1>
        <p className="text-sm text-muted-foreground">Record cash from each day&apos;s sales that was paid into the bank.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record a deposit</CardTitle>
          <CardDescription>The cash-sales figure is a reference taken from that day&apos;s sales.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dep-date">Date</Label>
              <Input id="dep-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dep-branch">Branch / showroom</Label>
              <select id="dep-branch" className={selectClass} value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
                <option value="">Select branch</option>
                {options.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="dep-account">Bank account</Label>
                <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setAccountOpen(true)}>
                  + Add account
                </button>
              </div>
              <select id="dep-account" className={selectClass} value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                <option value="">Select bank account</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bankName} · {a.accountNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm sm:col-span-2 lg:col-span-3">
              {reference ? (
                <div className="flex flex-wrap gap-x-8 gap-y-1">
                  <span>
                    Cash sales that day: <strong>{money(reference.cashSalesTotal)}</strong>
                  </span>
                  <span>
                    Already deposited: <strong>{money(reference.alreadyDeposited)}</strong>
                  </span>
                  <span>
                    Still to deposit: <strong>{money(reference.remaining)}</strong>
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">Choose a branch and date to see that day&apos;s cash sales.</span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dep-amount">Deposit amount (Rs.)</Label>
              <Input id="dep-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dep-slip">Slip / reference number</Label>
              <Input id="dep-slip" value={slip} onChange={(e) => setSlip(e.target.value)} maxLength={60} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dep-desc">Description</Label>
              <Input id="dep-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dep-by">Recorded by</Label>
              <Input id="dep-by" value={staffName} readOnly className="bg-muted/40" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={saving || !branchId || !accountId || !(amountNumber > 0)}>
                {saving && <LoaderCircle className="size-4 animate-spin" />} Record deposit
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Bank deposit report</CardTitle>
              <CardDescription>
                {rows.length} {rows.length === 1 ? "deposit" : "deposits"} · total {money(total)}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
                <Download className="size-3.5" /> CSV
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={exportPdf} disabled={rows.length === 0}>
                <FileDown className="size-3.5" /> PDF
              </Button>
            </div>
          </div>
          <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Branch</Label>
              <select className={`${selectClass} w-44`} value={filters.branchId} onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}>
                <option value="">All branches</option>
                {options.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bank account</Label>
              <select className={`${selectClass} w-52`} value={filters.bankAccountId} onChange={(e) => setFilters({ ...filters, bankAccountId: e.target.value })}>
                <option value="">All accounts</option>
                {options.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bankName} · {a.accountNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Slip / description</Label>
              <Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="w-44" placeholder="Search…" />
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <LoaderCircle className="size-4 animate-spin" />} Filter
            </Button>
          </form>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div ref={reportRef} data-pdf-document className="bg-card p-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Bank account</TableHead>
                  <TableHead className="text-right">Cash sales</TableHead>
                  <TableHead className="text-right">Deposited</TableHead>
                  <TableHead>Slip / ref.</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>By</TableHead>
                  {isOwner && <TableHead className="text-right" data-html2canvas-ignore>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isOwner ? 9 : 8} className="py-8 text-center text-muted-foreground">
                      No deposits match these filters.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.depositDate}</TableCell>
                    <TableCell>{r.branchName}</TableCell>
                    <TableCell>
                      {r.bankName} <span className="font-mono text-xs text-muted-foreground">{r.accountNumber}</span>
                    </TableCell>
                    <TableCell className="text-right">{money(r.cashSalesTotal)}</TableCell>
                    <TableCell className="text-right font-medium">{money(r.depositAmount)}</TableCell>
                    <TableCell className="font-mono">{r.slipNumber}</TableCell>
                    <TableCell className="max-w-48 truncate" title={r.description ?? ""}>
                      {r.description ?? "-"}
                    </TableCell>
                    <TableCell>{r.recordedBy}</TableCell>
                    {isOwner && (
                      <TableCell className="text-right" data-html2canvas-ignore>
                        <Button size="icon-sm" variant="ghost" aria-label="Delete deposit" onClick={() => remove(r.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {rows.length > 0 && (
                  <TableRow className="font-semibold">
                    <TableCell colSpan={4} className="text-right">
                      Total deposited
                    </TableCell>
                    <TableCell className="text-right">{money(total)}</TableCell>
                    <TableCell colSpan={isOwner ? 4 : 3} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add bank account</DialogTitle>
            <DialogDescription>Accounts you deposit cash into.</DialogDescription>
          </DialogHeader>
          <form onSubmit={addAccount} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="acc-bank">Bank</Label>
              <Input id="acc-bank" value={acc.bankName} onChange={(e) => setAcc({ ...acc, bankName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc-no">Account number</Label>
              <Input id="acc-no" value={acc.accountNumber} onChange={(e) => setAcc({ ...acc, accountNumber: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc-name">Account name (optional)</Label>
              <Input id="acc-name" value={acc.accountName} onChange={(e) => setAcc({ ...acc, accountName: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAccountOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <LoaderCircle className="size-4 animate-spin" />} <Plus className="size-4" /> Add account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
