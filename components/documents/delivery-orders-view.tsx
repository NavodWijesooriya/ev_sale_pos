"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, Download, FileSignature, Search } from "lucide-react"
import type { DeliveryOrdersData, DeliveryOrderRow } from "@/app/actions/documents"
import { DeliveryOrderActions } from "@/components/documents/delivery-order-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { downloadCsv } from "@/lib/csv"
import { formatLKR } from "@/lib/currency"
import { DO_STAGES, DO_STAGE_LABELS, DO_STAGE_SHORT, type DoStage } from "@/lib/documents"

const stageTone: Record<DoStage, string> = {
  AWAITING_DO: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  DO_RECEIVED: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  DELIVERED: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  CLAIM_SUBMITTED: "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  PAID: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
}

export function StageBadge({ stage }: { stage: DoStage }) {
  return (
    <span data-testid="do-stage" className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stageTone[stage]}`}>
      {DO_STAGE_SHORT[stage]}
    </span>
  )
}

/** Finance sales and where each one is between "finance approved" and "finance company paid". */
export function DeliveryOrdersView({ data, initialTab = "AWAITING_DO" }: { data: DeliveryOrdersData; initialTab?: DoStage }) {
  const [tab, setTab] = React.useState<DoStage>(initialTab)
  const [query, setQuery] = React.useState("")

  const counts = React.useMemo(() => {
    const result = Object.fromEntries(DO_STAGES.map((s) => [s, 0])) as Record<DoStage, number>
    for (const row of data.rows) result[row.stage] += 1
    return result
  }, [data.rows])

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.rows
      .filter((row) => row.stage === tab)
      .filter(
        (row) =>
          !q ||
          [row.invoiceNumber, row.customerName, row.customerPhone, row.chassisNumber, row.financeCompany, row.doNumber ?? ""].some((value) =>
            value.toLowerCase().includes(q),
          ),
      )
      .sort((a, b) => b.agingDays - a.agingDays)
  }, [data.rows, tab, query])

  function exportCsv() {
    const header = ["Invoice", "Sale date", "Branch", "Customer", "Phone", "Vehicle", "Chassis", "Finance company", "Stage", "Days in stage", "DO number", "DO date", "Expiry", "Delivered", "Claim submitted", "Claim reference", "Paid", "Warnings"]
    if (data.canSeeAmounts) header.splice(9, 0, "Finance amount", "DO amount")
    const rows = visible.map((row) => {
      const cells: (string | number)[] = [
        row.invoiceNumber, row.saleDate.slice(0, 10), row.branchName, row.customerName, row.customerPhone, row.vehicle, row.chassisNumber,
        row.financeCompany, DO_STAGE_LABELS[row.stage], row.agingDays, row.doNumber ?? "", row.doDate ?? "", row.expiryDate ?? "",
        row.deliveredAt ?? "", row.claim?.submittedAt ?? "", row.claim?.reference ?? "", row.paidAt ?? "", row.warnings.join(" | "),
      ]
      if (data.canSeeAmounts) cells.splice(9, 0, row.financeAmount ?? "", row.doAmount ?? "")
      return cells
    })
    downloadCsv(`delivery_orders_${DO_STAGES.indexOf(tab) + 1}_${tab.toLowerCase()}.csv`, [header, ...rows])
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 hidden size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
            <FileSignature className="size-5" />
          </span>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Delivery Orders</h1>
            <p className="text-sm text-muted-foreground">
              Finance sales from the finance company&apos;s approval, through delivery and the claim, to payment.
              {!data.canManage && " You can view these; recording needs the Received documents permission."}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={exportCsv} data-testid="export-do">
          <Download className="size-3.5" /> CSV (this tab)
        </Button>
      </header>

      <Card>
        <CardHeader className="space-y-3 pb-3">
          <Tabs value={tab} onValueChange={(value) => setTab(value as DoStage)}>
            <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/80 p-1">
              {DO_STAGES.map((stage) => (
                <TabsTrigger key={stage} value={stage} className="px-3 py-1.5 text-xs" data-testid={`tab-${stage}`}>
                  {DO_STAGE_LABELS[stage]} ({counts[stage]})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-9 pl-9 text-xs" placeholder="Search invoice, customer, chassis, DO no. or finance company..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table data-testid="do-table">
            <TableHeader>
              <TableRow>
                <TableHead>Sale</TableHead>
                <TableHead>Finance company</TableHead>
                <TableHead>DO</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Days in stage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nothing in this stage.
                  </TableCell>
                </TableRow>
              )}
              {visible.map((row) => (
                <DoRow key={row.saleId} row={row} data={data} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function DoRow({ row, data }: { row: DeliveryOrderRow; data: DeliveryOrdersData }) {
  return (
    <TableRow data-testid="do-row">
      <TableCell className="whitespace-normal">
        <Link href={`/dashboard/sales/${row.saleId}`} className="font-medium hover:underline">
          {row.invoiceNumber}
        </Link>
        <p className="text-xs text-muted-foreground">
          {row.customerName} · {row.customerPhone}
        </p>
        <p className="text-xs text-muted-foreground">
          {row.vehicle} · {row.chassisNumber} · {row.branchName}
        </p>
        {data.canSeeAmounts && row.financeAmount !== null && <p className="text-xs text-muted-foreground">Finance amount {formatLKR(row.financeAmount)}</p>}
      </TableCell>
      <TableCell className="whitespace-normal text-sm">
        {row.financeCompany}
        {row.financeOffice && <p className="text-xs text-muted-foreground">{row.financeOffice}</p>}
      </TableCell>
      <TableCell className="whitespace-normal text-xs">
        {row.doNumber ? (
          <>
            <p className="font-medium">{row.doNumber}</p>
            <p className="text-muted-foreground">
              {row.doDate}
              {data.canSeeAmounts && row.doAmount !== null ? ` · ${formatLKR(row.doAmount)}` : ""}
            </p>
            {row.expiryDate && <p className="text-muted-foreground">Expires {row.expiryDate}</p>}
          </>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
        {row.deliveredAt && <p className="text-muted-foreground">Delivered {row.deliveredAt}</p>}
        {row.claim && <p className="text-muted-foreground">Claim {row.claim.submittedAt}{row.claim.reference ? ` · ${row.claim.reference}` : ""}</p>}
        {row.paidAt && <p className="text-emerald-600">Paid {row.paidAt}</p>}
        {row.overrideReason && <p className="text-amber-600">Override: {row.overrideReason}</p>}
        {row.warnings.map((warning) => (
          <p key={warning} data-testid="do-warning" className="mt-1 flex items-start gap-1 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {warning}
          </p>
        ))}
      </TableCell>
      <TableCell>
        <StageBadge stage={row.stage} />
      </TableCell>
      <TableCell className="text-right">
        {row.stage === "PAID" ? (
          "-"
        ) : (
          <Badge variant={row.agingDays >= 14 ? "destructive" : "outline"} className="font-mono">
            {row.agingDays}d
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end">
          <DeliveryOrderActions row={row} canManage={data.canManage} canOverride={data.canOverride} />
        </div>
      </TableCell>
    </TableRow>
  )
}
