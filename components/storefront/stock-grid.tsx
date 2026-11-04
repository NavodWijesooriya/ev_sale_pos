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
  PhoneCall,
  Calendar,
  MessageSquare,
  Building2,
  X,
} from "lucide-react"
import { formatLKR } from "@/lib/currency"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface StockModelItem {
  id: string
  brand: string
  modelName: string
  imageUrl?: string | null
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
  dealerPhone?: string | null
}

export function StockGrid({ models, dealershipName, dealerPhone }: StockGridProps) {
  const [search, setSearch] = React.useState("")
  const [selectedBrand, setSelectedBrand] = React.useState<string>("all")
  const [inStockOnly, setInStockOnly] = React.useState(false)
  const [selectedModelForInquiry, setSelectedModelForInquiry] = React.useState<StockModelItem | null>(null)

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

  const cleanPhone = dealerPhone?.replace(/[^0-9]/g, "") || "94770000000"

  return (
    <div className="space-y-6">
      {/* 1. Search and Filters Bar (Adapts to Dark & Light Themes) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border dark:border-slate-800 bg-card/90 dark:bg-slate-900/90 text-card-foreground dark:text-slate-100 backdrop-blur-md shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by brand, EV bike model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-3 text-xs rounded-xl border border-input dark:border-slate-700 bg-background dark:bg-slate-950 text-foreground dark:text-slate-100 placeholder:text-muted-foreground dark:placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Brand Selector */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="h-9 rounded-xl border border-input dark:border-slate-700 bg-background dark:bg-slate-950 text-foreground dark:text-slate-100 px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
          >
            {brands.map((b) => (
              <option key={b} value={b} className="bg-popover dark:bg-slate-900 text-popover-foreground dark:text-slate-100">
                {b === "all" ? "All Brands" : b}
              </option>
            ))}
          </select>

          {/* In Stock Toggle */}
          <button
            type="button"
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`h-9 px-3.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
              inStockOnly
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                : "bg-background dark:bg-slate-950 text-muted-foreground dark:text-slate-300 hover:bg-muted dark:hover:bg-slate-800 border-input dark:border-slate-700"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                inStockOnly ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
              }`}
            />
            In Stock Only
          </button>
        </div>
      </div>

      {/* 2. Models Grid */}
      {filtered.length === 0 ? (
        <div className="p-14 text-center rounded-2xl border-2 border-dashed border-border dark:border-slate-800 bg-card/40 dark:bg-slate-900/40">
          <div className="size-14 rounded-full bg-muted dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Bike className="size-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground dark:text-slate-100">No EV bikes match your criteria</h3>
          <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search terms or uncheck the "In Stock Only" filter to view our complete lineup.
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
                className="overflow-hidden border border-border dark:border-slate-800/90 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between bg-card dark:bg-slate-900/90 text-card-foreground dark:text-slate-100 group rounded-2xl"
              >
                <div>
                  {/* Large Edge-to-Edge Image Header */}
                  <div className="relative h-60 sm:h-64 w-full bg-slate-950 overflow-hidden">
                    {model.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={model.imageUrl}
                        alt={`${model.brand} ${model.modelName}`}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      /* High-tech Stylized Sri Lankan EV Backdrop */
                      <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-center items-center p-6 relative">
                        <div className="absolute -top-12 -right-12 size-40 bg-emerald-500/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
                        <div className="absolute -bottom-12 -left-12 size-40 bg-blue-500/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
                        
                        <div className="size-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300 z-10 backdrop-blur-xs">
                          <Bike className="size-11 text-emerald-300 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <span className="text-[11px] text-slate-300 mt-3 font-semibold tracking-wider uppercase z-10">
                          {model.brand} • 100% Electric
                        </span>
                      </div>
                    )}

                    {/* Gradient Overlay for Top Badges */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 pointer-events-none" />

                    {/* Top Floating Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-white px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 shadow-sm">
                        {model.brand}
                      </span>

                      {hasStock ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 shadow-sm backdrop-blur-md">
                          <CheckCircle2 className="size-3" />
                          {model.inStockCount} In Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 shadow-sm backdrop-blur-md">
                          <Clock className="size-3" />
                          Pre-Order
                        </span>
                      )}
                    </div>

                    {/* Bottom Specs Ribbon on Image */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white z-10">
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-medium">
                        <Gauge className="size-3 text-cyan-300" />
                        {model.topSpeed || "55 km/h Top Speed"}
                      </span>
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-medium">
                        <Clock className="size-3 text-amber-300" />
                        {model.chargingTime || "4-6h Fast Charge"}
                      </span>
                    </div>
                  </div>

                  {/* Card Header */}
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-xl font-bold tracking-tight text-card-foreground dark:text-slate-100 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                          {model.modelName}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5 text-muted-foreground dark:text-slate-400">
                          Electric Scooter & Bike • Certified Sri Lankan DMT Warranty
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Clear Bold Sri Lankan Price Section */}
                    <div className="p-3.5 rounded-xl bg-muted/40 dark:bg-slate-950/70 border border-border dark:border-slate-800 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-muted-foreground dark:text-slate-400 font-semibold uppercase tracking-wider">
                          Retail Cash Price
                        </span>
                        <span className="text-2xl font-black tracking-tight text-foreground dark:text-emerald-400">
                          {formatLKR(model.defaultPrice)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-border/80 dark:border-slate-800">
                        <span className="text-muted-foreground dark:text-slate-400">Min Down Payment:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatLKR(minDown)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground dark:text-slate-400">
                        <span>Est. Bank Lease / Installment:</span>
                        <span className="font-semibold text-foreground dark:text-slate-200">
                          ~{formatLKR(estimatedMonthly)}/mo (48 mos)
                        </span>
                      </div>
                    </div>

                    {/* Key 3 EV Bike Specifications Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-secondary/40 dark:bg-slate-950/50 border border-border dark:border-slate-800/80 text-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground dark:text-slate-400 text-[10px] font-semibold">
                          <Zap className="size-3 text-amber-500 shrink-0" />
                          <span>MOTOR</span>
                        </div>
                        <div className="text-xs font-bold text-foreground dark:text-slate-200 truncate">
                          {model.motorPower || "2000W"}
                        </div>
                      </div>
                      <div className="space-y-0.5 border-x border-border dark:border-slate-800 px-1">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground dark:text-slate-400 text-[10px] font-semibold">
                          <Gauge className="size-3 text-cyan-500 shrink-0" />
                          <span>RANGE</span>
                        </div>
                        <div className="text-xs font-bold text-foreground dark:text-slate-200 truncate">
                          {model.rangePerCharge || model.range || "120 km"}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground dark:text-slate-400 text-[10px] font-semibold">
                          <BatteryCharging className="size-3 text-emerald-500 shrink-0" />
                          <span>BATTERY</span>
                        </div>
                        <div className="text-xs font-bold text-foreground dark:text-slate-200 truncate">
                          {model.batteryCapacity || "60V 32Ah"}
                        </div>
                      </div>
                    </div>

                    {/* Available In-Stock Colors */}
                    {model.availableColors.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground dark:text-slate-400">
                          Showroom Colors:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {model.availableColors.map((color, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2.5 py-0.5 rounded-full bg-muted dark:bg-slate-800 border border-border dark:border-slate-700 text-muted-foreground dark:text-slate-300 font-medium"
                            >
                              {color}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Card CTA Actions */}
                <div className="p-4 pt-0 space-y-2">
                  <Button
                    className="w-full text-xs h-10 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-sm rounded-xl cursor-pointer transition-all"
                    onClick={() => setSelectedModelForInquiry(model)}
                  >
                    <span>Inquire / Book Test Ride</span>
                    <ArrowRight className="ml-1.5 size-4" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* 3. Interactive Inquiry & Test Ride Modal */}
      {selectedModelForInquiry && (
        <Dialog open={!!selectedModelForInquiry} onOpenChange={() => setSelectedModelForInquiry(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl bg-card dark:bg-slate-900 text-card-foreground dark:text-slate-100 border border-border dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground dark:text-slate-100">
                <Bike className="size-5 text-emerald-500" />
                {selectedModelForInquiry.brand} {selectedModelForInquiry.modelName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground dark:text-slate-400">
                Inquire directly with {dealershipName} to reserve this EV bike or schedule a test ride.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-muted/40 dark:bg-slate-950 border border-border dark:border-slate-800 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground dark:text-slate-400">Price:</span>
                  <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                    {formatLKR(selectedModelForInquiry.defaultPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground dark:text-slate-400">Range / Charge:</span>
                  <span className="font-semibold text-foreground dark:text-slate-200">
                    {selectedModelForInquiry.rangePerCharge || selectedModelForInquiry.range || "120 km"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground dark:text-slate-400">Available Units:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedModelForInquiry.inStockCount} In Stock
                  </span>
                </div>
              </div>

              {selectedModelForInquiry.vehicles.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground dark:text-slate-400">
                    Showroom Branches with Stock:
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {selectedModelForInquiry.vehicles.map((v) => (
                      <div
                        key={v.id}
                        className="text-xs p-2 rounded-lg bg-muted/30 dark:bg-slate-950/60 border border-border dark:border-slate-800 flex items-center justify-between"
                      >
                        <span className="font-medium flex items-center gap-1.5 text-foreground dark:text-slate-200">
                          <Building2 className="size-3 text-emerald-500" />
                          {v.branchName || "Main Showroom"}
                        </span>
                        <span className="text-[11px] text-muted-foreground dark:text-slate-400">
                          Color: {v.color || "Standard"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    `Hello ${dealershipName}, I am interested in the ${selectedModelForInquiry.brand} ${selectedModelForInquiry.modelName} listed on your showroom for ${formatLKR(selectedModelForInquiry.defaultPrice)}. Is it available for a test ride?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    className="w-full text-xs h-9 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                  >
                    <MessageSquare className="size-3.5 mr-1.5 text-emerald-500" />
                    WhatsApp
                  </Button>
                </a>

                {dealerPhone ? (
                  <a href={`tel:${dealerPhone}`} className="w-full">
                    <Button className="w-full text-xs h-9 font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
                      <PhoneCall className="size-3.5 mr-1.5" />
                      Call Dealer
                    </Button>
                  </a>
                ) : (
                  <Button
                    className="w-full text-xs h-9 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => {
                      alert(`Please visit the ${dealershipName} showroom or call our sales desk for reservations.`)
                      setSelectedModelForInquiry(null)
                    }}
                  >
                    Book Test Ride
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

