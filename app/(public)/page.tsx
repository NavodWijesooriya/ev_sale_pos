import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Zap,
  BatteryCharging,
  Gauge,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Building2,
  CheckCircle2,
  Bike,
  Clock,
} from "lucide-react"

export default function PublicLandingPage() {
  const showcaseEVs = [
    {
      brand: "Volt Motors",
      model: "Apex GT Electric Bike",
      motorPower: "2000W",
      rangePerCharge: "120 km",
      batteryCapacity: "60V 32Ah",
      topSpeed: "55 km/h",
      chargingTime: "4-6 Hours",
      price: "$2,450",
      downPayment: "From $250 down",
      tag: "Top Seller",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      brand: "EcoRide",
      model: "Thunder Pro Cargo Scooter",
      motorPower: "3000W",
      rangePerCharge: "150 km",
      batteryCapacity: "72V 45Ah",
      topSpeed: "65 km/h",
      chargingTime: "5-6 Hours",
      price: "$3,100",
      downPayment: "From $350 down",
      tag: "Commercial Cargo",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      brand: "HyperVolt",
      model: "Pulse City Commuter Bike",
      motorPower: "1200W",
      rangePerCharge: "90 km",
      batteryCapacity: "48V 24Ah",
      topSpeed: "45 km/h",
      chargingTime: "3-4 Hours",
      price: "$1,690",
      downPayment: "From $170 down",
      tag: "Best Value",
      badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Zap className="size-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">Ev Sale Pos</span>
              <span className="text-xs text-muted-foreground ml-1.5 font-medium px-2 py-0.5 rounded-full bg-muted border">
                Showroom
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#inventory" className="hover:text-foreground transition-colors">
              Live EV Stock
            </a>
            <a href="#financing" className="hover:text-foreground transition-colors">
              Lease & Finance
            </a>
            <a href="#about" className="hover:text-foreground transition-colors">
              Dealership Network
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                Dealer Staff Login
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                Access Portal
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden border-b">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))]" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/60 text-xs font-medium text-foreground mb-6 shadow-sm">
              <Sparkles className="size-3.5 text-blue-500" />
              <span>Multi-Tenant Electric Bike Dealership Cloud ERP</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
              Next-Gen Showroom &{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                Live EV Bike Inventory
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-normal leading-relaxed">
              Browse real-time electric bike & scooter stock, motor power ratings, verified range per charge, transparent prices, and flexible down payments.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="#inventory">
                <Button size="lg" className="w-full sm:w-auto px-8 shadow-md">
                  View Live EV Bikes
                </Button>
              </a>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
                  <Building2 className="mr-2 size-4" />
                  Dealership Admin Login
                </Button>
              </Link>
            </div>

            {/* Quick feature checklist */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Chassis & Motor Serial Tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Multi-Branch Bike Stock Sync</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Instant Down Payment & Lease Approvals</span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Inventory Preview Section */}
        <section id="inventory" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <Badge variant="outline" className="mb-2 text-primary border-primary/30">
                Live Showroom Preview
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Featured Electric Bikes in Stock
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Connected directly to dealership inventory branches with instant pricing and installment quotes.
              </p>
            </div>
            <Link href="/login">
              <Button variant="ghost" className="text-sm font-medium group">
                Manage Inventory in Portal
                <ArrowRight className="ml-1.5 size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {showcaseEVs.map((ev, idx) => (
              <Card
                key={idx}
                className="hover:shadow-lg transition-all duration-200 border-border/80 hover:border-primary/40 bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Bike Image Area Placeholder */}
                  <div className="relative h-44 w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-between p-4 border-b">
                    <div className="flex items-center justify-between z-10">
                      <span className="text-[11px] font-semibold tracking-wider uppercase text-blue-400/90 px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-800/40">
                        {ev.brand}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${ev.badgeColor}`}>
                        {ev.tag}
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center my-auto z-10">
                      <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-200">
                        <Bike className="size-8 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1.5 font-mono">
                        100% Electric EV Bike
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-300 z-10 pt-1 border-t border-white/10">
                      <span className="flex items-center gap-1">
                        <Gauge className="size-3 text-cyan-400" />
                        {ev.topSpeed} Top Speed
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3 text-amber-400" />
                        {ev.chargingTime} Charge
                      </span>
                    </div>
                  </div>

                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{ev.model}</CardTitle>
                    <CardDescription>Zero Emission • BLDC Hub Motor • Smart BMS</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Key Pricing */}
                    <div className="p-3 bg-muted/40 rounded-lg border space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-muted-foreground">Starting Retail</span>
                        <span className="text-2xl font-bold tracking-tight text-foreground">
                          {ev.price}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">Min Down Payment:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {ev.downPayment}
                        </span>
                      </div>
                    </div>

                    {/* Prominent EV Bike Specs: motorPower, rangePerCharge, batteryCapacity */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/40 text-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                          <Zap className="size-3 text-amber-500 shrink-0" />
                          <span>Motor</span>
                        </div>
                        <div className="text-xs font-bold text-foreground truncate">
                          {ev.motorPower}
                        </div>
                      </div>
                      <div className="space-y-0.5 border-x border-border/60 px-1">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                          <Gauge className="size-3 text-cyan-500 shrink-0" />
                          <span>Range</span>
                        </div>
                        <div className="text-xs font-bold text-foreground truncate">
                          {ev.rangePerCharge}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                          <BatteryCharging className="size-3 text-emerald-500 shrink-0" />
                          <span>Battery</span>
                        </div>
                        <div className="text-xs font-bold text-foreground truncate">
                          {ev.batteryCapacity}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-0">
                  <Button className="w-full" variant="outline" size="sm">
                    Inquire / Reserve EV Bike
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Enterprise Dealership Architecture Banner */}
        <section id="financing" className="py-14 bg-muted/40 border-y">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <ShieldCheck className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Multi-Tenant Isolation</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Every dealership gets secure, partitioned database records with customized branch and user role access.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <BatteryCharging className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">GRN & Stock Tracking</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track battery serial numbers, motor IDs, and VIN chassis barcodes from port delivery to handover.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Zap className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Split Cash & Lease POS</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Execute instant sales with split down payments, bank finance disbursement verification, and automated invoicing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            <span className="font-semibold text-foreground">Ev Sale Pos</span>
            <span>— Enterprise Multi-Tenant EV Platform</span>
          </div>
          <div>
            <span>© 2026 Ev Sale Pos. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
