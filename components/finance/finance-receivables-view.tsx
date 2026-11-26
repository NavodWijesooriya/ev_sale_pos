"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Download, HandCoins, LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import {
  bounceFinanceCheque,
  clearFinanceCheque,
  presentFinanceCheque,
  reverseFinanceReceipt,
  type ReceiptRow,
  type ReceivableGroup,
} from "@/app/actions/finance-receivables"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { downloadCsv } from "@/lib/csv"
import { colomboDateKey } from "@/lib/dates"
import { AGING_BUCKETS, AGING_LABELS, type AgingBucket } from "@/lib/finance-receivables"
import { ReceiveFinancePaymentDialog } from "./receive-finance-payment-dialog"

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 dark:bg-input/30"

const money = (n: number) =>
  `Rs. ${new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`

interface Props {
  groups: ReceivableGroup[]
  totals: { outstanding: number; reserved: number; available: number; count: number; buckets: Record<AgingBucket, number> }
  companies: { id: string; name: string }[]
  branches: { id: string; name: string }[]
  receipts: ReceiptRow[]
  filters: { company: string; branch: string; aging: string }
}

type ChequeAction = { kind: "bounce" | "reverse"; id: string; label: string; applied: boolean }

export function FinanceReceivablesView({ groups, totals, companies, branches, receipts, filters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [receiveOpen, setReceiveOpen] = React.useState(false)
  const [receiveTarget, setReceiveTarget] = React.useState<{ companyId?: string; detailId?: string }>({})
  const [busy, setBusy] = React.useState(false)
  const [action, setAction] = React.useState<ChequeAction | null>(null)
  const [reason, setReason] = React.useState("")

  function setFilter(key: "company" | "branch" | "aging", value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  function openReceive(target: { companyId?: string; detailId?: string } = {}) {
    setReceiveTarget(target)
    setReceiveOpen(true)
  }

  async function run(fn: () => Promise<{ success: boolean; message: string }>, done?: () => void) {
    setBusy(true)
    try {
      const result = await fn()
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      done?.()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.")
    } finally {
      setBusy(false)
    }
  }

  function exportPending() {
    downloadCsv(`finance_receivables_${colomboDateKey(new Date())}.csv`, [
      [
        "Finance Company",
        "Invoice",
        "Sale Date",
        "Customer",
        "Branch",
        "Finance Office",
        "Finance Amount (Rs.)",
        "Received (Rs.)",
        "Balance (Rs.)",
        "Pending Cheques (Rs.)",
        "Status",
        "Age (days)",
        "Aging",
        "Expected Date",
      ],
      ...groups.flatMap((g) =>
        g.items.map((i) => [
          g.financeCompanyName,
          i.invoiceNumber,
          colomboDateKey(new Date(i.saleDate)),
          i.customerName,
          i.branchName,
          i.officeName ?? "",
          i.totalFinanceAmount,
          i.receivedAmount,
          i.balanceAmount,
          i.reservedAmount,
          i.status,
          i.ageDays,
          AGING_LABELS[i.bucket],
          i.expectedDate ? colomboDateKey(new Date(i.expectedDate)) : "",
        ]),
      ),
      ["", "", "", "", "", "", "", totals.outstanding, totals.reserved, "TOTAL", "", "", ""],
    ])
  }

  const cheques = receipts.filter((r) => r.cheque)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance Receivables</h1>
          <p className="text-sm text-muted-foreground">
            What finance (leasing) companies still owe on finance sales, and the payments they make. Commission is tracked
            separately.
          </p>
        </div>
        <Button onClick={() => openReceive()}>
          <HandCoins className="size-4" /> Receive payment
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 pt-6">
            <p className="text-sm text-muted-foreground">Total outstanding</p>
            <p className="text-2xl font-semibold">{money(totals.outstanding)}</p>
            <p className="text-xs text-muted-foreground">{totals.count} finance sale(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-6">
            <p className="text-sm text-muted-foreground">Promised by uncleared cheques</p>
            <p className="text-2xl font-semibold">{money(totals.reserved)}</p>
            <p className="text-xs text-muted-foreground">Not deducted until the cheque clears</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-6">
            <p className="text-sm text-muted-foreground">Still to chase</p>
            <p className="text-2xl font-semibold">{money(totals.available)}</p>
            <p className="text-xs text-muted-foreground">Outstanding minus uncleared cheques</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending receivables</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="cheques">Received cheques</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------ pending */}
        <TabsContent value="pending" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Finance company" className={selectClass} value={filters.company} onChange={(e) => setFilter("company", e.target.value)}>
              <option value="">All finance companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select aria-label="Branch" className={selectClass} value={filters.branch} onChange={(e) => setFilter("branch", e.target.value)}>
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <Button type="button" size="sm" variant="outline" onClick={exportPending} disabled={groups.length === 0}>
              <Download className="size-3.5" /> CSV
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {AGING_BUCKETS.map((bucket) => (
              <button
                key={bucket}
                type="button"
                onClick={() => setFilter("aging", filters.aging === bucket ? "" : bucket)}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  filters.aging === bucket ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                }`}
              >
                <span className="block text-muted-foreground">{AGING_LABELS[bucket]}</span>
                <span className="text-sm font-semibold">{money(totals.buckets[bucket])}</span>
              </button>
            ))}
          </div>

          {groups.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nothing is owed by any finance company{filters.aging || filters.company || filters.branch ? " for these filters" : ""}.
              </CardContent>
            </Card>
          )}

          {groups.map((group) => (
            <Card key={group.financeCompanyId ?? "none"}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>{group.financeCompanyName}</CardTitle>
                    <CardDescription>
                      {group.count} sale(s) · outstanding {money(group.outstanding)}
                      {group.reserved > 0 && ` · ${money(group.reserved)} promised by cheques`}
                    </CardDescription>
                  </div>
                  {group.financeCompanyId ? (
                    <Button size="sm" onClick={() => openReceive({ companyId: group.financeCompanyId ?? undefined })}>
                      Receive from {group.financeCompanyName}
                    </Button>
                  ) : (
                    <Badge variant="destructive">No company linked</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-xs text-muted-foreground">
                  {AGING_BUCKETS.map((b) => (
                    <span key={b}>
                      {AGING_LABELS[b]}: <strong className="text-foreground">{money(group.buckets[b])}</strong>
                    </span>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Sale date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Office</TableHead>
                      <TableHead className="text-right">Finance amount</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((i) => (
                      <TableRow key={i.financeDetailId}>
                        <TableCell className="font-medium">{i.invoiceNumber}</TableCell>
                        <TableCell>{colomboDateKey(new Date(i.saleDate))}</TableCell>
                        <TableCell>{i.customerName}</TableCell>
                        <TableCell>{i.branchName}</TableCell>
                        <TableCell data-testid="receivable-office">{i.officeName ?? "—"}</TableCell>
                        <TableCell className="text-right">{money(i.totalFinanceAmount)}</TableCell>
                        <TableCell className="text-right">{money(i.receivedAmount)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {money(i.balanceAmount)}
                          {i.reservedAmount > 0 && (
                            <span className="block text-xs font-normal text-muted-foreground">{money(i.reservedAmount)} on cheque</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={i.status === "Partial" ? "default" : "secondary"}>{i.status}</Badge>
                          {i.overdue && <span className="ml-1 text-xs font-medium text-destructive">Overdue</span>}
                        </TableCell>
                        <TableCell>{i.ageDays}d</TableCell>
                        <TableCell className="text-right">
                          {group.financeCompanyId && i.availableAmount > 0 && (
                            <Button size="sm" variant="outline" onClick={() => openReceive({ companyId: group.financeCompanyId ?? undefined, detailId: i.financeDetailId })}>
                              Receive
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ------------------------------------------------------------ receipts */}
        <TabsContent value="receipts" className="pt-4">
          <Card>
            <CardContent className="overflow-x-auto pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No payments recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {receipts.map((r) => (
                    <TableRow key={r.id} className={r.status === "REVERSED" ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">{r.receiptNumber}</TableCell>
                      <TableCell>{r.receiptDate}</TableCell>
                      <TableCell>{r.financeCompanyName}</TableCell>
                      <TableCell>
                        {r.method === "BankTransfer" ? "Bank transfer" : r.method === "CHEQUE" ? "Cheque" : "Cash"}
                        {r.referenceNo && <span className="block text-xs text-muted-foreground">{r.referenceNo}</span>}
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-xs" title={r.invoices.join(", ")}>
                        {r.invoices.join(", ")}
                      </TableCell>
                      <TableCell className="text-right">{money(r.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "REVERSED" ? "destructive" : r.status === "PENDING" ? "secondary" : "default"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "COMPLETED" && !r.cheque && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAction({ kind: "reverse", id: r.id, label: r.receiptNumber, applied: true })
                              setReason("")
                            }}
                          >
                            Reverse
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------ cheques */}
        <TabsContent value="cheques" className="pt-4">
          <Card>
            <CardHeader>
              <CardDescription>
                Cheques received from finance companies. The balances change only when a cheque is cleared.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cheque no.</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Cheque date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cheques.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No cheques received.
                      </TableCell>
                    </TableRow>
                  )}
                  {cheques.map((r) => {
                    const c = r.cheque!
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.chequeNumber}</TableCell>
                        <TableCell>{r.financeCompanyName}</TableCell>
                        <TableCell>{c.bankName}</TableCell>
                        <TableCell>{c.chequeDate}</TableCell>
                        <TableCell className="text-right">{money(r.amount)}</TableCell>
                        <TableCell>{r.receiptNumber}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === "BOUNCED" ? "destructive" : c.status === "CLEARED" ? "default" : "secondary"}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="space-x-2 text-right">
                          {c.status === "RECEIVED" && (
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => presentFinanceCheque({ chequeId: c.id }))}>
                              Presented
                            </Button>
                          )}
                          {(c.status === "RECEIVED" || c.status === "PRESENTED") && (
                            <Button size="sm" disabled={busy} onClick={() => run(() => clearFinanceCheque({ chequeId: c.id }))}>
                              Clear
                            </Button>
                          )}
                          {c.status !== "BOUNCED" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busy}
                              onClick={() => {
                                setAction({ kind: "bounce", id: c.id, label: c.chequeNumber, applied: c.status === "CLEARED" })
                                setReason("")
                              }}
                            >
                              {c.status === "CLEARED" ? "Returned" : "Bounced"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ReceiveFinancePaymentDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        companies={companies}
        initialCompanyId={receiveTarget.companyId}
        initialFinanceDetailId={receiveTarget.detailId}
      />

      <Dialog open={!!action} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action?.kind === "reverse" ? `Reverse receipt ${action.label}` : `Cheque ${action?.label} bounced`}
            </DialogTitle>
            <DialogDescription>
              {action?.kind === "reverse" || action?.applied
                ? "The money applied to the sales is taken back and their balances and statuses are restored. This happens once and cannot be undone."
                : "The cheque had not cleared, so no balance changes. The payment is cancelled."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="fin-reason">Reason (optional)</Label>
            <Input id="fin-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                action &&
                run(
                  () =>
                    action.kind === "reverse"
                      ? reverseFinanceReceipt({ receiptId: action.id, reason })
                      : bounceFinanceCheque({ chequeId: action.id, reason }),
                  () => setAction(null),
                )
              }
            >
              {busy && <LoaderCircle className="size-4 animate-spin" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
