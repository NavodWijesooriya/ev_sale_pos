"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Download, FileSignature, Search } from "lucide-react"
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

/** Amber badge for a bike delivered through the override (before its Delivery Order was recorded). The reason is the tooltip. */
export function DeliveredWithoutDoBadge({ row }: { row: Pick<DeliveryOrderRow, "overrideReason"> }) {
  if (!row.overrideReason) return null
  return (
    <span
      data-testid="delivered-without-do"
      title={`Delivered before the Delivery Order was recorded. Reason: ${row.overrideReason}`}
      className="inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300"
    >
      <AlertTriangle className="size-3" /> Delivered without DO
    </span>
  )
}

const number = (n: number) => new Intl.NumberFormat("en-LK").format(n)

/** DO amount minus the sale's finance amount, or null when they match (or either is hidden from this user). */
function amountDifference(row: DeliveryOrderRow): number | null {
  if (row.doAmount === null || row.financeAmount === null) return null
  const diff = row.doAmount - row.financeAmount
  return Math.abs(diff) > 0.5 ? diff : null
}

type SortKey = "aging" | "doDate"
type SortState = { key: SortKey; dir: "asc" | "desc" }

function SortHeader({ label, sortKey, sort, onSort, className = "" }: { label: string; sortKey: SortKey; sort: SortState; onSort: (key: SortKey) => void; className?: string }) {
  const active = sort.key === sortKey
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown
  return (
    <TableHead className={className} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 font-medium hover:text-foreground" data-testid={`sort-${sortKey}`}>
        {label} <Icon className={`size-3 ${active ? "text-foreground" : "text-muted-foreground"}`} />
      </button>
    </TableHead>
  )
}

/** Finance sales and where each one is between "finance approved" and "finance company paid". */
export function DeliveryOrdersView({ data, initialTab = "AWAITING_DO" }: { data: DeliveryOrdersData; initialTab?: DoStage }) {
  const [tab, setTab] = React.useState<DoStage>(initialTab)
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState<SortState>({ key: "aging", dir: "desc" })

  const counts = React.useMemo(() => {
    const result = Object.fromEntries(DO_STAGES.map((s) => [s, 0])) as Record<DoStage, number>
    for (const row of data.rows) result[row.stage] += 1
    return result
  }, [data.rows])

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = data.rows
      .filter((row) => row.stage === tab)
      .filter(
        (row) =>
          !q ||
          [row.invoiceNumber, row.customerName, row.customerPhone, row.chassisNumber, row.financeCompany, row.doNumber ?? ""].some((value) =>
            value.toLowerCase().includes(q),
          ),
      )
    const factor = sort.dir === "asc" ? 1 : -1
    return rows.sort((a, b) => {
      if (sort.key === "doDate") {
        // Sales without a DO date always go last, whichever way it is sorted.
        if (!a.doDate && !b.doDate) return 0
        if (!a.doDate) return 1
        if (!b.doDate) return -1
        return a.doDate.localeCompare(b.doDate) * factor
      }
      return (a.agingDays - b.agingDays) * factor
    })
  }, [data.rows, tab, query, sort])

  function onSort(key: SortKey) {
    setSort((current) => (current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "aging" ? "desc" : "asc" }))
  }

  const showAmounts = data.canSeeAmounts
  // No DO yet on the first tab, so there is no DO amount to show there.
  const showDoAmountColumn = showAmounts && tab !== "AWAITING_DO"

  function exportCsv() {
    const header = ["Invoice", "Sale date", "Branch", "Customer", "Phone", "Vehicle", "Chassis", "Finance company", "Stage", "Days in stage", "DO number", "Internal DO number", "DO date", "Expiry", "Delivered", "Delivered without DO", "Claim submitted", "Claim reference", "Paid", "Warnings"]
    if (showAmounts) header.splice(10, 0, "Finance amount", "DO amount", "DO amount difference")
    const rows = visible.map((row) => {
      const diff = amountDifference(row)
      const cells: (string | number)[] = [
        row.invoiceNumber, row.saleDate.slice(0, 10), row.branchName, row.customerName, row.customerPhone, row.vehicle, row.chassisNumber,
        row.financeCompany, DO_STAGE_LABELS[row.stage], row.agingDays, row.doNumber ?? "", row.doNumberInternal ? "Yes" : "", row.doDate ?? "", row.expiryDate ?? "",
        row.deliveredAt ?? "", row.overrideReason ? "Yes" : "", row.claim?.submittedAt ?? "", row.claim?.reference ?? "", row.paidAt ?? "", row.warnings.join(" | "),
      ]
      if (showAmounts) cells.splice(10, 0, row.financeAmount ?? "", row.doAmount ?? "", diff ?? "")
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
                <SortHeader label={tab === "AWAITING_DO" ? "Sale / DO" : "DO (sort by DO date)"} sortKey="doDate" sort={sort} onSort={onSort} />
                {showDoAmountColumn && <TableHead className="text-right">DO amount</TableHead>}
                <TableHead>Stage</TableHead>
                <SortHeader label="Days in stage" sortKey="aging" sort={sort} onSort={onSort} className="text-right" />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showDoAmountColumn ? 7 : 6} className="py-8 text-center text-muted-foreground">
                    Nothing in this stage.
                  </TableCell>
                </TableRow>
              )}
              {visible.map((row) => (
                <DoRow key={row.saleId} row={row} data={data} tab={tab} showDoAmountColumn={showDoAmountColumn} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function DoRow({ row, data, tab, showDoAmountColumn }: { row: DeliveryOrderRow; data: DeliveryOrdersData; tab: DoStage; showDoAmountColumn: boolean }) {
  const diff = amountDifference(row)
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
      </TableCell>
      <TableCell className="whitespace-normal text-sm">
        {row.financeCompany}
        {row.financeOffice && <p className="text-xs text-muted-foreground">{row.financeOffice}</p>}
      </TableCell>
      <TableCell className="whitespace-normal text-xs" data-testid="do-details">
        {row.doNumber ? (
          <>
            <p className="font-medium">
              {row.doNumber}
              {row.doNumberInternal && (
                <span data-testid="do-internal" className="ml-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-1 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400" title="An internal reference, not the finance company's number">
                  internal
                </span>
              )}
            </p>
            <p className="text-muted-foreground" data-testid="do-date">DO date {row.doDate ?? "-"}</p>
            {tab === "DO_RECEIVED" && row.expiryDate && <p className="text-muted-foreground">Expires {row.expiryDate}</p>}
          </>
        ) : tab === "AWAITING_DO" ? (
          <>
            <p className="text-muted-foreground">No DO yet</p>
            <p className="text-muted-foreground" data-testid="sale-date">Sold {row.saleDate.slice(0, 10)}</p>
            {data.canSeeAmounts && row.financeAmount !== null && <p className="text-muted-foreground">Finance amount {formatLKR(row.financeAmount)}</p>}
          </>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
        {tab === "DELIVERED" && row.deliveredAt && <p className="text-muted-foreground" data-testid="delivered-date">Delivered {row.deliveredAt}</p>}
        {(tab === "CLAIM_SUBMITTED" || tab === "PAID") && row.claim && (
          <p className="text-muted-foreground" data-testid="claim-date">
            Claim submitted {row.claim.submittedAt}
            {row.claim.reference ? ` · ${row.claim.reference}` : ""}
          </p>
        )}
        {tab === "PAID" && row.paidAt && <p className="text-emerald-600">Paid {row.paidAt}</p>}
        {row.overrideReason && <p className="text-amber-700 dark:text-amber-400">Override reason: {row.overrideReason}</p>}
        {row.warnings.map((warning) => (
          <p key={warning} data-testid="do-warning" className="mt-1 flex items-start gap-1 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {warning}
          </p>
        ))}
      </TableCell>
      {showDoAmountColumn && (
        <TableCell className="whitespace-nowrap text-right text-sm" data-testid="do-amount">
          {row.doAmount === null ? (
            <span className="text-muted-foreground">-</span>
          ) : diff !== null ? (
            <span
              className="font-semibold text-amber-700 dark:text-amber-400"
              title={`DO amount differs from the sale's finance amount (${formatLKR(row.financeAmount ?? 0)}): ${number(Math.abs(diff))} ${diff < 0 ? "less" : "more"}.`}
              data-testid="do-amount-diff"
            >
              {formatLKR(row.doAmount)} ({diff < 0 ? "−" : "+"}
              {number(Math.abs(diff))})
            </span>
          ) : (
            formatLKR(row.doAmount)
          )}
          {row.doAmount !== null && row.financeAmount !== null && (
            <span className="block text-[11px] font-normal text-muted-foreground" data-testid="do-sale-finance">
              Sale finance amount {formatLKR(row.financeAmount)}
            </span>
          )}
          {row.downPayment && (
            <span
              className={`block text-[11px] font-normal ${row.downPayment.balance > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-600"}`}
              data-testid="do-down-payment"
            >
              {row.downPayment.balance > 0
                ? `Customer owes ${formatLKR(row.downPayment.balance)} more down payment`
                : "Additional down payment paid"}
            </span>
          )}
          {row.amountNote && <span className="block text-[11px] font-normal text-muted-foreground" title={row.amountNote}>Higher than finance amount (note)</span>}
        </TableCell>
      )}
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <StageBadge stage={row.stage} />
          <DeliveredWithoutDoBadge row={row} />
        </div>
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
