"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BatteryCharging,
  Gauge,
  Zap,
  Search,
  CheckCircle2,
  Clock,
  Bike,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"

export interface StockModelItem {
  id: string
  brand: string
  modelName: string
  batteryCapacity: string | null
  range: string | null
  motorPower?: string | null
  rangePerCharge?: string | null
  topSpeed?: string | null
  chargingTime?: string | null
  defaultPrice: number
  minDownPayment: number | null
  inStockCount: number
  availableColors: string[]
  vehicles: {
    id: string
    chassisNumber: string
    color: string | null
    branchName?: string
  }[]
}

interface StockGridProps {
  models: StockModelItem[]
  dealershipName: string
}

export function StockGrid({ models, dealershipName }: StockGridProps) {
  const [search, setSearch] = React.useState("")
  const [selectedBrand, setSelectedBrand] = React.useState<string>("all")
  const [inStockOnly, setInStockOnly] = React.useState(false)

  // Extract unique brands
  const brands = React.useMemo(() => {
    const list = Array.from(new Set(models.map((m) => m.brand)))
    return ["all", ...list]
  }, [models])

  // Filter models
  const filtered = React.useMemo(() => {
    return models.filter((item) => {
      const matchesSearch =
        search === "" ||
        item.modelName.toLowerCase().includes(search.toLowerCase()) ||
        item.brand.toLowerCase().includes(search.toLowerCase())

      const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand

      const matchesStock = !inStockOnly || item.inStockCount > 0

      return matchesSearch && matchesBrand && matchesStock
    })
  }, [models, search, selectedBrand, inStockOnly])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card/60 backdrop-blur-md">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by brand, EV bike model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-input bg-muted/30 placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Brand Selector */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus:ring-1 focus:ring-ring dark:bg-input/30"
          >
            {brands.map((b) => (
              <option key={b} value={b} className="bg-popover text-popover-foreground">
                {b === "all" ? "All Brands" : b}
              </option>
            ))}
          </select>

          {/* In Stock Toggle */}
          <button
            type="button"
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`h-9 px-3 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              inStockOnly
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/60 border-input"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                inStockOnly ? "bg-emerald-500" : "bg-muted-foreground"
              }`}
            />
            In Stock Only
          </button>
        </div>
      </div>

      {/* Models Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed bg-card/40">
          <Bike className="size-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-semibold text-foreground">No EV bikes match your filters</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search query or clear the "In Stock Only" filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((model) => {
            const hasStock = model.inStockCount > 0
            const minDown = model.minDownPayment ?? Math.round(model.defaultPrice * 0.1)
            const estimatedMonthly = Math.round((model.defaultPrice - minDown) / 48)

            return (
              <Card
                key={model.id}
                className="overflow-hidden border-border/80 hover:border-primary/40 hover:shadow-lg transition-all duration-200 flex flex-col justify-between bg-card/60 backdrop-blur-xs group"
              >
                <div>
                  {/* EV Bike Image Placeholder Area */}
                  <div className="relative h-48 w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-between p-4 overflow-hidden border-b">
                    {/* Ambient light glow */}
                    <div className="absolute -top-10 -right-10 size-32 bg-blue-500/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

                    <div className="flex items-center justify-between z-10">
                      <span className="text-[11px] font-semibold tracking-wider uppercase text-blue-400/90 px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-800/40">
                        {model.brand}
                      </span>

                      {/* Stock Badge */}
                      {hasStock ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="size-3" />
                          {model.inStockCount} In Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Clock className="size-3" />
                          Order for Delivery
                        </span>
                      )}
                    </div>

                    {/* Central Stylized EV Bike Silhouette / Icon */}
                    <div className="flex flex-col items-center justify-center my-auto z-10">
                      <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-200">
                        <Bike className="size-9 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-2 font-mono tracking-wide">
                        100% Electric EV Bike
                      </span>
                    </div>

                    {/* Bottom Specs Ribbon */}
                    <div className="flex items-center justify-between text-[11px] text-slate-300 z-10 pt-1 border-t border-white/10">
                      <span className="flex items-center gap-1">
                        <Gauge className="size-3 text-cyan-400" />
                        {model.topSpeed || "55 km/h Top Speed"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3 text-amber-400" />
                        {model.chargingTime || "4-6 Hours Charge"}
                      </span>
                    </div>
                  </div>

                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                      {model.modelName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Electric Bike • Available at {dealershipName} Showroom
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Pricing & Down Payment Breakdown */}
                    <div className="p-3 rounded-xl bg-muted/40 border space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-muted-foreground font-medium">
                          Retail Cash Price
                        </span>
                        <span className="text-xl font-bold tracking-tight text-foreground">
                          {formatCurrency(model.defaultPrice)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border/60">
                        <span className="text-muted-foreground">Min Down Payment:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(minDown)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Est. Installment Lease:</span>
                        <span className="font-medium text-foreground">
                          ~{formatCurrency(estimatedMonthly)}/mo (48 mos)
                        </span>
                      </div>
                    </div>

                    {/* Key EV Bike Specifications Highlight */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                          <Zap className="size-3 text-amber-500 shrink-0" />
                          <span>Motor</span>
                        </div>
                        <div className="text-xs font-bold text-foreground truncate">
                          {model.motorPower || "2000W"}
                        </div>
                      </div>
                      <div className="space-y-0.5 border-x border-border/60 px-1">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                          <Gauge className="size-3 text-cyan-500 shrink-0" />
                          <span>Range</span>
                        </div>
                        <div className="text-xs font-bold text-foreground truncate">
                          {model.rangePerCharge || model.range || "120km"}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                          <BatteryCharging className="size-3 text-emerald-500 shrink-0" />
                          <span>Battery</span>
                        </div>
                        <div className="text-xs font-bold text-foreground truncate">
                          {model.batteryCapacity || "60V 32Ah"}
                        </div>
                      </div>
                    </div>

                    {/* Available Colors */}
                    {model.availableColors.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          In-Stock Colors:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {model.availableColors.map((color, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-muted border text-muted-foreground font-medium"
                            >
                              {color}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Card Action */}
                <div className="p-4 pt-0">
                  <Button
                    className="w-full text-xs h-9 bg-primary text-primary-foreground font-medium shadow-xs"
                    onClick={() => {
                      alert(
                        `Inquiry for ${model.brand} ${model.modelName}.\nPlease call ${dealershipName} to reserve this EV Bike!`
                      )
                    }}
                  >
                    <span>Reserve / Inquire EV Bike</span>
                    <ArrowRight className="ml-1.5 size-3.5" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
