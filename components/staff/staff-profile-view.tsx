"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Download, Loader2, Pencil, RefreshCw } from "lucide-react"
import { recalculateStaffMonth, saveStaffPay, type StaffMonthPay } from "@/app/actions/staff-pay"
import { EMPTY_PAY_FORM, PayFields, payFormFrom, payFormToRates, type PayFormState } from "@/components/staff/pay-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { downloadCsv } from "@/lib/csv"
import { colomboDateKey } from "@/lib/dates"
import { describeRate, money, NO_COMPENSATION } from "@/lib/staff-pay"

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "rounded-xl border-2 border-primary/40 bg-primary/5 p-3" : "rounded-xl border p-3"}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={strong ? "text-xl font-bold" : "text-lg font-semibold"} data-testid={`stat-${label}`}>
        {value}
      </p>
    </div>
  )
}

export function StaffProfileView({ data }: { data: StaffMonthPay }) {
  const router = useRouter()
  const { profile } = data
  const [editOpen, setEditOpen] = React.useState(false)
  const [recalcOpen, setRecalcOpen] = React.useState(false)
  const [form, setForm] = React.useState<PayFormState>(EMPTY_PAY_FORM)
  const [effectiveFrom, setEffectiveFrom] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const current = profile.current ?? NO_COMPENSATION

  function openEdit() {
    setForm(payFormFrom(profile.current))
    setEffectiveFrom(colomboDateKey(new Date()))
    setEditOpen(true)
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await saveStaffPay({ userId: profile.id, effectiveFrom, rates: payFormToRates(form) })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setEditOpen(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function recalculate() {
    setBusy(true)
    try {
      const result = await recalculateStaffMonth(profile.id, data.month)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setRecalcOpen(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  function exportCsv() {
    const safeName = profile.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()
    downloadCsv(`staff_pay_${safeName}_${data.month}`, [
      ["Staff", profile.name, "Month", data.monthLabel],
      [],
      ["Date", "Invoice", "Bike model", "Payment", "Staff sale commission (LKR)", "Staff finance commission (LKR)", "Note"],
      ...data.sales.map((sale) => [
        sale.date,
        sale.invoiceNumber,
        sale.model,
        sale.paymentType === "FINANCE" ? "Finance" : "Cash",
        sale.saleCommission,
        sale.financeCommission,
        sale.voided ? "Voided" : sale.noCommission ? "No commission recorded" : "",
      ]),
      [],
      ["Basic salary", data.basicSalary],
      ["Total staff sale commission", data.totalSaleCommission],
      ["Total staff finance commission", data.totalFinanceCommission],
      ["TOTAL PAYABLE", data.totalPayable],
    ])
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/settings/users" className="text-sm text-muted-foreground hover:underline">
          ← Team &amp; Access
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{profile.name}</h1>
          <Badge variant="secondary">{profile.role}</Badge>
          <Badge variant={profile.isActive ? "outline" : "destructive"}>{profile.isActive ? "Active" : "Blocked"}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile.email} · {profile.branchName}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Salary &amp; staff commission</CardTitle>
            <CardDescription>
              What this staff member earns. Separate from the dealership&apos;s own finance / insurance commission. Changes apply to
              sales from the effective date; commissions already earned never change.
            </CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={openEdit} data-testid="edit-pay">
            <Pencil className="size-3.5" /> Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-3" data-testid="current-pay">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Basic salary</dt>
              <dd className="text-sm font-medium">{money(current.basicSalary)} / month</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Staff sale commission</dt>
              <dd className="text-sm font-medium">
                {describeRate(current.saleCommissionType, current.saleCommissionValue, "bike")}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Staff finance commission</dt>
              <dd className="text-sm font-medium">
                {describeRate(current.financeCommissionType, current.financeCommissionValue, "finance")}
              </dd>
            </div>
          </dl>
          {!profile.current && <p className="text-sm text-muted-foreground">No salary or commission has been set up yet.</p>}

          {profile.history.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Change history ({profile.history.length})</summary>
              <div className="mt-2 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Effective from</TableHead>
                      <TableHead className="text-right">Salary</TableHead>
                      <TableHead>Sale commission</TableHead>
                      <TableHead>Finance commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile.history.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.effectiveFrom}</TableCell>
                        <TableCell className="text-right">{money(row.rates.basicSalary)}</TableCell>
                        <TableCell>{describeRate(row.rates.saleCommissionType, row.rates.saleCommissionValue, "bike")}</TableCell>
                        <TableCell>
                          {describeRate(row.rates.financeCommissionType, row.rates.financeCommissionValue, "finance")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Monthly earnings · {data.monthLabel}</CardTitle>
              <CardDescription>Sales made by {profile.name} and the staff commission they earned.</CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="pay-month" className="text-xs">
                  Month
                </Label>
                <Input
                  id="pay-month"
                  type="month"
                  value={data.month}
                  className="w-44"
                  onChange={(event) => event.target.value && router.push(`/dashboard/settings/users/${profile.id}?month=${event.target.value}`)}
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={exportCsv} data-testid="export-month">
                <Download className="size-3.5" /> CSV
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setRecalcOpen(true)} data-testid="recalculate">
                <RefreshCw className="size-3.5" /> Recalculate for this month
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Bike model</TableHead>
                  <TableHead>Cash / Finance</TableHead>
                  <TableHead className="text-right">Staff sale commission</TableHead>
                  <TableHead className="text-right">Staff finance commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sales.map((sale) => (
                  <TableRow key={sale.saleId} data-testid="pay-sale-row">
                    <TableCell>{sale.date}</TableCell>
                    <TableCell className="font-mono text-xs">{sale.invoiceNumber}</TableCell>
                    <TableCell>{sale.model}</TableCell>
                    <TableCell>
                      <Badge variant={sale.paymentType === "FINANCE" ? "default" : "secondary"}>
                        {sale.paymentType === "FINANCE" ? "Finance" : "Cash"}
                      </Badge>
                      {sale.voided && (
                        <Badge variant="destructive" className="ml-1">
                          Voided
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{sale.noCommission && !sale.voided ? "-" : money(sale.saleCommission)}</TableCell>
                    <TableCell className="text-right">{sale.noCommission && !sale.voided ? "-" : money(sale.financeCommission)}</TableCell>
                  </TableRow>
                ))}
                {data.sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                      No sales by this staff member in {data.monthLabel}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {data.sales.some((sale) => sale.noCommission && !sale.voided) && (
            <p className="text-xs text-muted-foreground">
              A &quot;-&quot; means no commission was recorded for that sale (it was made before salary and commission were set up).
              Use &quot;Recalculate for this month&quot; to work it out with today&apos;s rates.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Basic salary" value={money(data.basicSalary)} />
            <Stat label="Staff sale commission" value={money(data.totalSaleCommission)} />
            <Stat label="Staff finance commission" value={money(data.totalFinanceCommission)} />
            <Stat label="Total payable" value={money(data.totalPayable)} strong />
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salary &amp; staff commission · {profile.name}</DialogTitle>
            <DialogDescription>
              The new settings start on the date below. Sales made before it keep the rates they earned with.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pay-effective-from">Effective from</Label>
              <Input
                id="pay-effective-from"
                type="date"
                required
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
                disabled={busy}
              />
            </div>
            <PayFields idPrefix="edit-pay" form={form} onChange={setForm} disabled={busy} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy} data-testid="save-pay">
                {busy && <Loader2 className="size-4 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={recalcOpen} onOpenChange={setRecalcOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recalculate for {data.monthLabel}?</DialogTitle>
            <DialogDescription>
              This works out staff commission for {profile.name}&apos;s sales this month that have none recorded, using the CURRENT
              rates (not the rates of the sale date). Commissions already earned when a sale was made are not changed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRecalcOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={recalculate} disabled={busy} data-testid="confirm-recalculate">
              {busy && <Loader2 className="size-4 animate-spin" />} Recalculate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
