"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bike, PieChart as PieChartIcon } from "lucide-react"
import { formatLKR } from "@/lib/currency"

interface ModelPieChartProps {
  data: {
    name: string
    brand: string
    count: number
    revenue: number
    percentage: number
    fill: string
  }[]
}

export function ModelPieChart({ data }: ModelPieChartProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const hasData = data && data.length > 0

  return (
    <Card className="shadow-xs border-border/80 flex flex-col justify-between">
      <CardHeader className="pb-2 border-b">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-cyan-500" />
            Sales by EV Bike Model
          </CardTitle>
          <CardDescription>
            Fleet distribution and bike model popularity by volume delivered
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-6 flex-1 flex flex-col justify-center">
        {!mounted ? (
          <div className="h-[320px] w-full flex items-center justify-center bg-muted/20 rounded-lg animate-pulse">
            <span className="text-sm text-muted-foreground">Loading model analytics...</span>
          </div>
        ) : !hasData ? (
          <div className="h-[320px] w-full flex flex-col items-center justify-center bg-muted/10 rounded-lg border border-dashed text-center p-6">
            <Bike className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <h4 className="font-medium text-foreground">No EV Bike Models Sold Yet</h4>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              EV bike model delivery metrics will appear here as soon as orders are booked in the selected period.
            </p>
          </div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1">
                          <p className="font-semibold text-sm">{item.name}</p>
                          <div className="flex items-center justify-between gap-4 text-slate-300">
                            <span>Units Sold:</span>
                            <span className="font-bold text-white">{item.count} units</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-300">
                            <span>Share of Sales:</span>
                            <span className="font-bold text-cyan-400">{item.percentage}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-300">
                            <span>Gross Revenue:</span>
                            <span className="font-bold text-emerald-400">
                              {formatLKR(item.revenue)}
                            </span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  formatter={(value, entry: any) => (
                    <span className="text-xs text-foreground font-medium">
                      {value} ({entry.payload?.percentage}%)
                    </span>
                  )}
                />
                <Pie
                  data={data}
                  cx="50%"
                  cy="45%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="name"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
