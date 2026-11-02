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
} from "lucide-react"

export default function PublicLandingPage() {
  const showcaseEVs = [
    {
      brand: "Volt Motors",
      model: "Apex GT Electric Sedan",
      range: "580 km",
      battery: "82 kWh",
      acceleration: "3.4s 0-100",
      price: "$48,500",
      downPayment: "From $4,850 down",
      tag: "Top Seller",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      brand: "EcoDrive",
      model: "Terra SUV AWD",
      range: "510 km",
      battery: "95 kWh",
      acceleration: "4.1s 0-100",
      price: "$56,900",
      downPayment: "From $5,690 down",
      tag: "Family Favorite",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      brand: "HyperVolt",
      model: "Pulse City Cruiser",
      range: "360 km",
      battery: "48 kWh",
      acceleration: "5.8s 0-100",
      price: "$29,990",
      downPayment: "From $2,999 down",
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
              <span className="font-bold text-lg tracking-tight">VoltPOS</span>
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
              <span>Multi-Tenant Electric Vehicle Dealership Cloud ERP</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
              Next-Gen Showroom &{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                Live EV Inventory
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-normal leading-relaxed">
              Browse real-time electric vehicle stock, transparent prices, instant lease calculations, and flexible down payment options.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="#inventory">
                <Button size="lg" className="w-full sm:w-auto px-8 shadow-md">
                  View Live Stock
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
                <span>Real-Time Chassis & VIN Tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Multi-Branch Stock Synchronization</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Instant Bank & Lease Approvals</span>
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
                Featured Electric Vehicles in Stock
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Connected directly to dealership inventory branches with instant pricing and lease quotes.
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
                className="hover:shadow-lg transition-all duration-200 border-border/80 hover:border-primary/40 bg-card/60 backdrop-blur-sm"
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {ev.brand}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${ev.badgeColor}`}>
                      {ev.tag}
                    </span>
                  </div>
                  <CardTitle className="text-xl">{ev.model}</CardTitle>
                  <CardDescription>Zero Emission • Advanced Battery Tech</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 py-3 px-3.5 bg-muted/50 rounded-lg text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Gauge className="size-3.5" />
                        <span className="text-[11px]">Range</span>
                      </div>
                      <span className="text-xs font-bold text-foreground">{ev.range}</span>
                    </div>
                    <div className="border-x border-border">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <BatteryCharging className="size-3.5" />
                        <span className="text-[11px]">Battery</span>
                      </div>
                      <span className="text-xs font-bold text-foreground">{ev.battery}</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Zap className="size-3.5" />
                        <span className="text-[11px]">0-100</span>
                      </div>
                      <span className="text-xs font-bold text-foreground">{ev.acceleration}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-baseline justify-between border-t">
                    <div>
                      <div className="text-xs text-muted-foreground">Starting Retail</div>
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        {ev.price}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {ev.downPayment}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Subject to credit</div>
                    </div>
                  </div>

                  <Button className="w-full mt-2" variant="outline" size="sm">
                    Inquire / Reserve Stock
                  </Button>
                </CardContent>
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
            <span className="font-semibold text-foreground">VoltPOS Cloud ERP</span>
            <span>— Enterprise Multi-Tenant EV Platform</span>
          </div>
          <div>
            <span>© 2026 VoltPOS Inc. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
