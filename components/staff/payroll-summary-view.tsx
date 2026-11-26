"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download } from "lucide-react"
import type { PayrollSummary } from "@/app/actions/staff-pay"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { downloadCsv } from "@/lib/csv"
import { money } from "@/lib/staff-pay"

export function PayrollSummaryView({ summary }: { summary: PayrollSummary }) {
  const router = useRouter()

  function exportCsv() {
    downloadCsv(`staff_payroll_${summary.month}`, [
      ["Staff", "Role", "Sales", "Basic salary (LKR)", "Staff sale commission (LKR)", "Staff finance commission (LKR)", "Total payable (LKR)"],
      ...summary.rows.map((row) => [
        row.name,
        row.role,
        row.salesCount,
        row.basicSalary,
        row.saleCommission,
        row.financeCommission,
        row.totalPayable,
      ]),
      [
        "TOTAL",
        "",
        summary.rows.reduce((sum, row) => sum + row.salesCount, 0),
        summary.totals.basicSalary,
        summary.totals.saleCommission,
        summary.totals.financeCommission,
        summary.totals.totalPayable,
      ],
    ])
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Settings &amp; Permissions</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Staff Payroll</h1>
        <p className="text-sm text-muted-foreground">Salary plus staff commission for every staff member, month by month.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3 space-y-0">
          <div>
            <CardTitle>{summary.monthLabel}</CardTitle>
            <CardDescription>Staff commission only: the dealership&apos;s own finance / insurance commission is not included.</CardDescription>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="payroll-month" className="text-xs">
                Month
              </Label>
              <Input
                id="payroll-month"
                type="month"
                className="w-44"
                value={summary.month}
                onChange={(event) => event.target.value && router.push(`/dashboard/settings/payroll?month=${event.target.value}`)}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={exportCsv} data-testid="export-payroll">
              <Download className="size-3.5" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Basic salary</TableHead>
                  <TableHead className="text-right">Staff sale commission</TableHead>
                  <TableHead className="text-right">Staff finance commission</TableHead>
                  <TableHead className="text-right">Total payable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.rows.map((row) => (
                  <TableRow key={row.userId} data-testid="payroll-row">
                    <TableCell>
                      <Link href={`/dashboard/settings/users/${row.userId}?month=${summary.month}`} className="font-medium text-primary hover:underline">
                        {row.name}
                      </Link>
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        {row.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.salesCount}</TableCell>
                    <TableCell className="text-right">{money(row.basicSalary)}</TableCell>
                    <TableCell className="text-right">{money(row.saleCommission)}</TableCell>
                    <TableCell className="text-right">{money(row.financeCommission)}</TableCell>
                    <TableCell className="text-right font-semibold">{money(row.totalPayable)}</TableCell>
                  </TableRow>
                ))}
                {summary.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                      No staff to show.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right">{money(summary.totals.basicSalary)}</TableCell>
                  <TableCell className="text-right">{money(summary.totals.saleCommission)}</TableCell>
                  <TableCell className="text-right">{money(summary.totals.financeCommission)}</TableCell>
                  <TableCell className="text-right font-bold" data-testid="payroll-total">
                    {money(summary.totals.totalPayable)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
