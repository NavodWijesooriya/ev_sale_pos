"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type {
  LedgerEntry,
  SupplierOutstandingRow,
  getSupplierPaymentHistory,
} from "@/app/actions/supplier-payments"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, formatMoney, nativeSelectClass, StatusBadge } from "./shared"

type PaymentHistory = Awaited<ReturnType<typeof getSupplierPaymentHistory>>

interface Props {
  report: SupplierOutstandingRow[]
  history: PaymentHistory
  ledger: {
    supplier: { id: string; name: string }
    entries: LedgerEntry[]
    closingBalance: number
    advanceBalance: number
  } | null
  selectedSupplierId: string
}

const methodLabel: Record<string, string> = { Cash: "Cash", BankTransfer: "Bank transfer", CHEQUE: "Cheque" }

export function SupplierLedgerView({ report, history, ledger, selectedSupplierId }: Props) {
  const router = useRouter()
  const totals = report.reduce(
    (t, r) => ({
      purchases: t.purchases + r.totalPurchases,
      paid: t.paid + r.totalPaid,
      outstanding: t.outstanding + r.outstanding,
    }),
    { purchases: 0, paid: 0, outstanding: 0 },
  )

  function selectSupplier(id: string) {
    router.push(id ? `/dashboard/suppliers/reports?supplierId=${encodeURIComponent(id)}` : "/dashboard/suppliers/reports")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Supplier Ledger & Reports</h1>
        <p className="text-sm text-muted-foreground">Outstanding balances, payment history and supplier accounts.</p>
      </div>

      <Tabs defaultValue={selectedSupplierId ? "ledger" : "outstanding"}>
        <TabsList>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="history">Payment history</TabsTrigger>
        </TabsList>

        <TabsContent value="outstanding" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier outstanding</CardTitle>
              <CardDescription>
                Purchases {formatMoney(totals.purchases)} · Paid {formatMoney(totals.paid)} · Outstanding{" "}
                {formatMoney(totals.outstanding)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Purchases</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Advance held</TableHead>
                    <TableHead className="text-right">Pending cheques</TableHead>
                    <TableHead className="text-right">Unpaid GRNs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No suppliers yet.</TableCell>
                    </TableRow>
                  )}
                  {report.map((r) => (
                    <TableRow key={r.supplierId}>
                      <TableCell>
                        <button
                          type="button"
                          className="font-medium text-primary hover:underline"
                          onClick={() => selectSupplier(r.supplierId)}
                        >
                          {r.supplierName}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(r.totalPurchases)}</TableCell>
                      <TableCell className="text-right">{formatMoney(r.totalPaid)}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(r.outstanding)}</TableCell>
                      <TableCell className="text-right">{formatMoney(r.advanceBalance)}</TableCell>
                      <TableCell className="text-right">{formatMoney(r.pendingCheques)}</TableCell>
                      <TableCell className="text-right">{r.unpaidGrns}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier ledger</CardTitle>
              <select
                aria-label="Select supplier"
                className={`${nativeSelectClass} mt-2 sm:w-64`}
                value={selectedSupplierId}
                onChange={(e) => selectSupplier(e.target.value)}
              >
                <option value="">Select supplier</option>
                {report.map((r) => (
                  <option key={r.supplierId} value={r.supplierId}>{r.supplierName}</option>
                ))}
              </select>
              {ledger && (
                <CardDescription>
                  {ledger.supplier.name} · Balance owed {formatMoney(ledger.closingBalance)} · Advance held{" "}
                  {formatMoney(ledger.advanceBalance)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {!ledger ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Select a supplier to view the account.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit (owed)</TableHead>
                      <TableHead className="text-right">Credit (paid)</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.entries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No transactions.</TableCell>
                      </TableRow>
                    )}
                    {ledger.entries.map((e, i) => (
                      <TableRow key={`${e.reference}-${i}`} className={e.type === "REVERSED_PAYMENT" ? "opacity-60" : undefined}>
                        <TableCell>{formatDate(e.date)}</TableCell>
                        <TableCell className="font-medium">{e.reference}</TableCell>
                        <TableCell>
                          {e.description}
                          {e.type === "REVERSED_PAYMENT" && <Badge variant="destructive" className="ml-2">Reversed</Badge>}
                        </TableCell>
                        <TableCell className="text-right">{e.debit ? formatMoney(e.debit) : "-"}</TableCell>
                        <TableCell className="text-right">{e.credit ? formatMoney(e.credit) : "-"}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(e.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment history</CardTitle>
              <CardDescription>
                {selectedSupplierId ? "Filtered to the selected supplier." : "Latest 500 payments across all suppliers."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Applied to</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No payments recorded.</TableCell>
                    </TableRow>
                  )}
                  {history.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.paymentNumber}</TableCell>
                      <TableCell>{formatDate(p.paymentDate)}</TableCell>
                      <TableCell>{p.supplierName}</TableCell>
                      <TableCell>
                        {methodLabel[p.method] ?? p.method}
                        {p.cheque && <span className="block text-xs text-muted-foreground">#{p.cheque.chequeNumber}</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.allocations.length
                          ? p.allocations.map((a) => `${a.grnNumber} (${formatMoney(a.amount)})`).join(", ")
                          : <span className="text-muted-foreground">Advance</span>}
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(p.amount)}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
