"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, LineChart as LineChartIcon, DollarSign, Bike } from "lucide-react"

interface RevenueChartProps {
  data: {
    date: string
    displayDate: string
    revenue: number
    units: number
    services: number
  }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [chartType, setChartType] = React.useState<"area" | "bar">("area")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const hasData = data && data.length > 0 && data.some((d) => d.revenue > 0 || d.units > 0)

  return (
    <Card className="shadow-xs border-border/80">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            Revenue & Sales Velocity Over Time
          </CardTitle>
          <CardDescription>
            Daily revenue generation and unit delivery trends across the selected period
          </CardDescription>
        </div>
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border">
          <Button
            size="sm"
            variant={chartType === "area" ? "default" : "ghost"}
            className="h-7 px-2.5 text-xs gap-1"
            onClick={() => setChartType("area")}
          >
            <LineChartIcon className="h-3.5 w-3.5" />
            Area
          </Button>
          <Button
            size="sm"
            variant={chartType === "bar" ? "default" : "ghost"}
            className="h-7 px-2.5 text-xs gap-1"
            onClick={() => setChartType("bar")}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Bar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {!mounted ? (
          <div className="h-[320px] w-full flex items-center justify-center bg-muted/20 rounded-lg animate-pulse">
            <span className="text-sm text-muted-foreground">Loading chart telemetry...</span>
          </div>
        ) : !hasData ? (
          <div className="h-[320px] w-full flex flex-col items-center justify-center bg-muted/10 rounded-lg border border-dashed text-center p-6">
            <Bike className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <h4 className="font-medium text-foreground">No Sales Data In This Range</h4>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              No EV bike sales or revenue transactions were logged within the selected date window. Try expanding your date filter.
            </p>
          </div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="unitsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value} u`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#f8fafc",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === "Revenue ($)") return [`$${Number(value).toLocaleString()}`, "Revenue"]
                      if (name === "Units Sold") return [`${value} units`, "Units Sold"]
                      return [value, name]
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue ($)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="units"
                    name="Units Sold"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#unitsGradient)"
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={data}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value} u`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === "Revenue ($)") return [`$${Number(value).toLocaleString()}`, "Revenue"]
                      if (name === "Units Sold") return [`${value} units`, "Units Sold"]
                      return [value, name]
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    name="Revenue ($)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="units"
                    name="Units Sold"
                    fill="#06b6d4"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
