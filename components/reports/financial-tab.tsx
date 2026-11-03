"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DollarSign,
  TrendingUp,
  Percent,
  Landmark,
  CarFront,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react"
import { AdvancedReportsData } from "@/app/actions/reports"

interface FinancialTabProps {
  data: AdvancedReportsData["financial"]
}

export function FinancialTab({ data }: FinancialTabProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Top 3 KPI Cards: Total Revenue, Total Finance Commission, Net Gross Profit */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Total Revenue */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
              ${data.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Vehicle Acquisition (COGS):</span>
              <strong className="text-foreground font-mono">
                ${data.totalAcquisitionCost.toLocaleString()}
              </strong>
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Total Finance Commission */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-purple-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-purple-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Finance Commission
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Landmark className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
              ${data.totalFinanceCommission.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span>Earned from partner bank leases & loans</span>
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Net Gross Profit */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-cyan-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-cyan-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Net Gross Profit
            </span>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-cyan-600 dark:text-cyan-400 font-mono">
                ${data.netGrossProfit.toLocaleString()}
              </span>
              <Badge
                variant="outline"
                className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 text-xs font-mono font-bold"
              >
                {data.profitMarginPercent}% Margin
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Profit formula: (Total + Charges - Discount) - Purchase Cost + Commission
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recharts Bar Chart: Revenue vs Profit (Last 6 Months) */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Revenue vs Profit (Last 6 Months)
              </CardTitle>
              <CardDescription className="text-xs">
                Monthly comparison of gross sales turnover versus realized gross dealership profit
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-3 w-3 rounded-xs bg-[#10b981]" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-3 w-3 rounded-xs bg-[#06b6d4]" /> Gross Profit
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {!mounted ? (
            <div className="h-[340px] w-full flex items-center justify-center bg-muted/20 rounded-lg animate-pulse">
              <span className="text-sm text-muted-foreground">Loading financial chart...</span>
            </div>
          ) : (
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.monthlyPerformance}
                  margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                  <XAxis
                    dataKey="monthLabel"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1.5">
                            <p className="font-bold text-sm text-slate-100">{label}</p>
                            <div className="flex items-center justify-between gap-6 text-slate-300">
                              <span>Vehicles Sold:</span>
                              <strong className="text-white">{item.units} units</strong>
                            </div>
                            <div className="flex items-center justify-between gap-6 text-emerald-400">
                              <span>Revenue:</span>
                              <strong>${item.revenue.toLocaleString()}</strong>
                            </div>
                            <div className="flex items-center justify-between gap-6 text-slate-400">
                              <span>Vehicle Cost (COGS):</span>
                              <strong>${item.acquisitionCost.toLocaleString()}</strong>
                            </div>
                            {item.commission > 0 && (
                              <div className="flex items-center justify-between gap-6 text-purple-400">
                                <span>Finance Commission:</span>
                                <strong>+${item.commission.toLocaleString()}</strong>
                              </div>
                            )}
                            <div className="border-t border-slate-700 pt-1 flex items-center justify-between gap-6 text-cyan-400 font-bold">
                              <span>Net Gross Profit:</span>
                              <span>${item.netProfit.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between gap-6 text-slate-400 text-[11px]">
                              <span>Profit Margin:</span>
                              <span className="text-cyan-300">{item.marginPercent}%</span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Revenue ($)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                  <Bar
                    dataKey="netProfit"
                    name="Gross Profit ($)"
                    fill="#06b6d4"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Financial Breakdown Table */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            6-Month Financial Ledger Breakdown
          </CardTitle>
          <CardDescription className="text-xs">
            Itemized month-by-month accounting overview of turnover, costs, commissions, and bottom-line margin
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs font-semibold">Month</TableHead>
                <TableHead className="text-xs font-semibold text-center">Units Sold</TableHead>
                <TableHead className="text-xs font-semibold text-right">Gross Revenue</TableHead>
                <TableHead className="text-xs font-semibold text-right">Vehicle Cost (COGS)</TableHead>
                <TableHead className="text-xs font-semibold text-right">Finance Commission</TableHead>
                <TableHead className="text-xs font-semibold text-right">Net Gross Profit</TableHead>
                <TableHead className="text-xs font-semibold text-center">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.monthlyPerformance.map((row) => (
                <TableRow key={row.monthKey} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="text-xs font-medium text-foreground">
                    {row.monthLabel}
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    {row.units > 0 ? (
                      <Badge variant="outline" className="text-[11px] font-mono">
                        {row.units} {row.units === 1 ? "unit" : "units"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-medium text-foreground">
                    ${row.revenue.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono text-muted-foreground">
                    ${row.acquisitionCost.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono text-purple-600 dark:text-purple-400">
                    {row.commission > 0 ? `+$${row.commission.toLocaleString()}` : "$0"}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    ${row.netProfit.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-mono ${
                        row.marginPercent > 0
                          ? "bg-cyan-500/10 text-cyan-600 border-cyan-500/20"
                          : "text-muted-foreground"
                      }`}
                    >
                      {row.marginPercent}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      </Card>
    </div>
  )
}
