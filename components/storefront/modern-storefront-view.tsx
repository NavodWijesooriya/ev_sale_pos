"use client"

import * as React from "react"
import Link from "next/link"
import { StockGrid, StockModelItem } from "@/components/storefront/stock-grid"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Zap,
  Phone,
  MapPin,
  Building2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Bike,
  CheckCircle2,
  TrendingDown,
  BatteryCharging,
  Gauge,
  Calendar,
  CreditCard,
  Download,
  Share2,
} from "lucide-react"
import { formatLKR } from "@/lib/currency"

interface BranchItem {
  id: string
  name: string
  location?: string | null
  contactNumber?: string | null
}

interface ModernStorefrontViewProps {
  dealershipName: string
  domain: string
  subdomain?: string | null
  logoUrl?: string | null
  phone?: string | null
  branches: BranchItem[]
  stockModels: StockModelItem[]
}

export function ModernStorefrontView({
  dealershipName,
  domain,
  subdomain,
  logoUrl,
  phone,
  branches,
  stockModels,
}: ModernStorefrontViewProps) {
  const [installPrompt, setInstallPrompt] = React.useState<any>(null)
  const [isInstalled, setIsInstalled] = React.useState(false)

  React.useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === "accepted") {
      setIsInstalled(true)
      setInstallPrompt(null)
    }
  }

  const totalInStock = stockModels.reduce((acc, m) => acc + m.inStockCount, 0)
  const primaryBranch = branches[0]
  const displayPhone = phone || primaryBranch?.contactNumber || "+94 11 234 5678"

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-primary selection:text-white">
      <section
        aria-label="Electric bike benefits"
        className="border-b border-emerald-400/15 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-emerald-50"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
              <Sparkles className="size-3.5" aria-hidden="true" />
            </span>
            <span>Ride electric. Save more.</span>
          </div>
          <span className="hidden h-4 w-px bg-emerald-100/20 sm:block" aria-hidden="true" />
          <p className="text-center text-[11px] leading-relaxed text-emerald-50/85 sm:text-xs">
            Save up to <strong className="font-semibold text-white">Rs. 30,000/month</strong> on fuel
            <span className="hidden sm:inline"> · </span>
            <span className="sm:ml-1">Sri Lankan DMT-registered bikes · 3-year battery warranty</span>
          </p>
        </div>
      </section>

      {/* 2. Sticky Glassmorphism Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Dealership Brand */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt={dealershipName}
                className="size-10 rounded-xl object-contain bg-white/10 p-1 border border-white/20"
              />
            ) : (
              <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Zap className="size-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  {dealershipName}
                </span>
                <span className="hidden md:inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                  Certified EV Dealer
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="font-mono text-cyan-400">Ev Sale Pos</span>
                {primaryBranch && (
                  <span className="hidden sm:inline-flex items-center gap-1">
                    • <MapPin className="size-3 text-muted-foreground" /> {primaryBranch.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#inventory" className="hover:text-emerald-400 transition-colors">
              Available EV Bikes ({totalInStock} In Stock)
            </a>
            <a href="#fuel-savings" className="hover:text-emerald-400 transition-colors">
              Fuel Savings
            </a>
            <a href="#financing" className="hover:text-emerald-400 transition-colors">
              Bank Leasing
            </a>
            <a href="#branches" className="hover:text-emerald-400 transition-colors">
              Branches & Showrooms
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            {installPrompt && !isInstalled && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleInstallClick}
                className="text-xs h-8 bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 hidden sm:inline-flex items-center gap-1.5"
              >
                <Download className="size-3.5" />
                Install App
              </Button>
            )}

            <a
              href={`tel:${displayPhone.replace(/[^0-9+]/g, "")}`}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/10 transition-colors"
            >
              <Phone className="size-3.5 text-emerald-400" />
              <span>{displayPhone}</span>
            </a>

            <Link href="/login">
              <Button
                size="sm"
                className="text-xs h-8 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
              >
                Dealer Login
                <ArrowRight className="ml-1 size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 3. Modern Sri Lankan Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Modern Tropical Colombo & Cyber Electric Background Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pointer-events-none" />
        <div className="absolute -top-40 right-1/4 size-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 -left-20 size-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Sri Lanka Certified Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-inner">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Sri Lanka's Next-Gen Clean Electric Two-Wheeler Network</span>
            </div>

            {/* Bold Headline */}
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
              Ride Free from Petrol Costs with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                {dealershipName}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Explore 100% road-legal electric bikes and scooters in Colombo, Kandy, and islandwide.
              Zero petrol queues, certified lithium battery packs with 3-year warranty, and instant lease approval.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <a href="#inventory" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/25 text-sm"
                >
                  <Bike className="size-4 mr-2" />
                  View Live Showroom Stock ({totalInStock} Available)
                </Button>
              </a>

              <a href="#financing" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto h-12 px-6 border-white/20 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm"
                >
                  <CreditCard className="size-4 mr-2 text-cyan-400" />
                  Calculate Bank Leasing
                </Button>
              </a>
            </div>

            {/* Trust Highlights Row */}
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                  <TrendingDown className="size-4 text-emerald-400" />
                  Running Cost
                </div>
                <div className="text-lg font-bold text-white mt-1">Rs. 0.85 / km</div>
                <div className="text-[10px] text-emerald-400">vs Rs. 14/km on Petrol</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                  <BatteryCharging className="size-4 text-cyan-400" />
                  Lithium Battery
                </div>
                <div className="text-lg font-bold text-white mt-1">3 Years</div>
                <div className="text-[10px] text-slate-400">Official Factory Warranty</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                  <Gauge className="size-4 text-amber-400" />
                  Riding Range
                </div>
                <div className="text-lg font-bold text-white mt-1">Up to 150 km</div>
                <div className="text-[10px] text-slate-400">Per single overnight charge</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="size-4 text-purple-400" />
                  Registration
                </div>
                <div className="text-lg font-bold text-white mt-1">DMT Certified</div>
                <div className="text-[10px] text-slate-400">Full Sri Lankan Road Legal</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Live EV Bikes Stock Grid Section */}
      <section id="inventory" className="py-16 bg-slate-900/60 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">
                <Zap className="size-3.5" />
                Live Showroom Inventory
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Current EV Bike Models & Transparent Pricing
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Real database stock from our {branches.length || 1} showroom branch location(s). All prices in Sri Lankan Rupees (LKR).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Filter or search models below</span>
            </div>
          </div>

          {/* Interactive Stock Grid Component with Real Data */}
          <div className="rounded-2xl bg-slate-950/40 p-4 sm:p-6 border border-white/5">
            <StockGrid
              models={stockModels}
              dealershipName={dealershipName}
              dealerPhone={displayPhone}
            />
          </div>
        </div>
      </section>

      {/* 5. Fuel Savings & Economics Section */}
      <section id="fuel-savings" className="py-16 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
              Sri Lankan Commuter Economics
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Why Switch to Electric in Sri Lanka Today?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              With rising 92 & 95 Octane petrol prices and routine engine maintenance, an EV bike pays for itself in less than 18 months.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-gradient-to-b from-white/5 to-white/0 border border-white/10 space-y-3">
              <div className="size-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <TrendingDown className="size-6" />
              </div>
              <h3 className="text-base font-bold text-white">Rs. 25,000+ Monthly Savings</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Charging a 60V 32Ah battery consumes only ~2.5 units of electricity (Rs. 90-120) for 120 km of commuting, compared to Rs. 1,600+ on petrol.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-b from-white/5 to-white/0 border border-white/10 space-y-3">
              <div className="size-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <CheckCircle2 className="size-6" />
              </div>
              <h3 className="text-base font-bold text-white">Zero Engine Oil & Clutch Repairs</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Brushless hub motors have no gearbox, spark plugs, or engine oil. Maintenance is limited to standard brake pads and tire care.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-b from-white/5 to-white/0 border border-white/10 space-y-3">
              <div className="size-12 rounded-xl bg-primary/20 text-purple-400 flex items-center justify-center">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="text-base font-bold text-white">Instant DMT Registration</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Our team handles all paperwork with the Department of Motor Traffic (DMT) for official number plates, revenue license, and full insurance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Bank Leasing & Financing Section */}
      <section id="financing" className="py-16 bg-slate-900/40 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/60 p-8 sm:p-12 border border-emerald-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 size-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CreditCard className="size-4" />
                Hassle-Free Leasing Partners
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Affordable EV Leasing with Leading Sri Lankan Financial Institutions
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Take home your new electric bike today with as little as 10% down payment. We work directly with major banks and finance companies for 1-day approvals.
              </p>

              <div className="pt-2 flex flex-wrap gap-2 text-xs font-medium text-slate-300">
                <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">Commercial Bank</span>
                <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">Hatton National Bank</span>
                <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">Sampath Bank</span>
                <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">LB Finance</span>
                <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">LOLC Finance</span>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <a href={`tel:${displayPhone.replace(/[^0-9+]/g, "")}`}>
                  <Button className="h-10 text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6">
                    <Phone className="size-3.5 mr-1.5" />
                    Speak to Leasing Officer
                  </Button>
                </a>
                <a href="#inventory">
                  <Button variant="outline" className="h-10 text-xs border-white/20 bg-white/5 text-white px-6">
                    Browse Qualifying Bikes
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Showroom Branches Section */}
      <section id="branches" className="py-16 bg-slate-950 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-bold text-white">Visit Our Showroom Branches</h2>
            <p className="text-xs text-slate-400">
              Experience the acceleration and silent comfort firsthand. Walk into our showrooms for a free test ride today.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((b) => (
              <div
                key={b.id}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="size-4 text-emerald-400" />
                    {b.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Open Now
                  </span>
                </div>

                <div className="text-xs text-slate-300 flex items-start gap-2">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{b.location || "Colombo City Center Flagship Showroom"}</span>
                </div>

                <div className="text-xs text-slate-300 flex items-center gap-2 pt-1 border-t border-white/10">
                  <Phone className="size-3.5 text-emerald-400 shrink-0" />
                  <span>{b.contactNumber || displayPhone}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Modern Storefront Footer */}
      <footer className="mt-auto border-t border-white/10 bg-slate-950 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-emerald-500 flex items-center justify-center text-slate-950">
              <Zap className="size-3.5" />
            </div>
            <span className="font-semibold text-white">{dealershipName}</span>
            <span>• Powered by Ev Sale Pos</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>100% Sri Lankan Road Legal</span>
            <span>•</span>
            <Link href="/login" className="hover:text-white transition-colors">
              Dealer Staff Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
