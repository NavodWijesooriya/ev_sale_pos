import { prisma } from "@/lib/prisma"
import { DealershipNotFoundView } from "@/components/storefront/not-found-view"
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
  ExternalLink,
  Bike,
} from "lucide-react"
import Link from "next/link"

export const instant = false

interface PageProps {
  params: Promise<{ domain: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { domain } = await params
  const normalized = decodeURIComponent(domain).toLowerCase().trim()

  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { subdomain: { equals: normalized, mode: "insensitive" } },
        { domain: { equals: normalized, mode: "insensitive" } },
      ],
    },
    select: { businessName: true },
  })

  if (!org) {
    return {
      title: "Dealership Not Found | Ev Sale Pos",
    }
  }

  return {
    title: `${org.businessName} | Live EV Bike Inventory & Showroom`,
    description: `Explore live electric bike and scooter stock, specifications, transparent pricing, and instant lease financing at ${org.businessName}.`,
  }
}

export default async function DealershipStorefrontPage({ params }: PageProps) {
  const { domain } = await params
  const normalizedDomain = decodeURIComponent(domain).toLowerCase().trim()

  // 1. Fetch Organization matching domain or subdomain
  const organization = await prisma.organization.findFirst({
    where: {
      OR: [
        { subdomain: { equals: normalizedDomain, mode: "insensitive" } },
        { domain: { equals: normalizedDomain, mode: "insensitive" } },
      ],
    },
    include: {
      branches: true,
      vehicleModels: {
        include: {
          vehicles: {
            where: {
              status: "InStock",
            },
            include: {
              branch: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          defaultPrice: "asc",
        },
      },
    },
  })

  // 2. Handle 404 Dealership Not Found
  if (!organization) {
    return <DealershipNotFoundView domain={normalizedDomain} />
  }

  // Handle Suspended Dealership
  if (organization.subscriptionStatus === "Suspended") {
    return (
      <DealershipNotFoundView
        domain={normalizedDomain}
        isSuspended={true}
        dealershipName={organization.businessName}
      />
    )
  }

  // 3. Process Available EV Stock
  const stockModels: StockModelItem[] = organization.vehicleModels.map((model) => {
    const inStockVehicles = model.vehicles
    const availableColors = Array.from(
      new Set(
        inStockVehicles
          .map((v) => v.color)
          .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      )
    )

    return {
      id: model.id,
      brand: model.brand,
      modelName: model.modelName,
      batteryCapacity: model.batteryCapacity,
      range: model.range,
      motorPower: model.motorPower,
      rangePerCharge: model.rangePerCharge,
      topSpeed: model.topSpeed,
      chargingTime: model.chargingTime,
      defaultPrice: model.defaultPrice,
      minDownPayment: model.minDownPayment,
      inStockCount: inStockVehicles.length,
      availableColors,
      vehicles: inStockVehicles.map((v) => ({
        id: v.id,
        chassisNumber: v.chassisNumber,
        color: v.color,
        branchName: v.branch?.name,
      })),
    }
  })

  const totalInStock = stockModels.reduce((acc, m) => acc + m.inStockCount, 0)
  const primaryBranch = organization.branches[0]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background flex flex-col text-foreground">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Zap className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-foreground">
                  {organization.businessName}
                </span>
                <span className="hidden sm:inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Certified EV Bike Dealer
                </span>
              </div>
              {primaryBranch && (
                <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="size-3" />
                  <span>{primaryBranch.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Contact & Staff Portal */}
          <div className="flex items-center gap-3">
            {organization.phone && (
              <a
                href={`tel:${organization.phone}`}
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-muted/60 hover:bg-muted px-3 py-1.5 rounded-full border transition-colors"
              >
                <Phone className="size-3.5 text-blue-500" />
                <span>{organization.phone}</span>
              </a>
            )}

            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs h-8">
                <Building2 className="mr-1.5 size-3.5" />
                Staff Portal
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-16 pb-14 md:pt-24 md:pb-20 overflow-hidden border-b bg-gradient-to-b from-card/30 to-background">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_70%_at_50%_-10%,rgba(59,130,246,0.12),transparent)]" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/60 text-xs font-medium text-foreground shadow-xs">
              <Sparkles className="size-3.5 text-blue-500" />
              <span>Official EV Bike Dealership Inventory & Showroom</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
              Electrify Your Ride with{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                {organization.businessName}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-normal">
              Explore real-time electric bike and scooter stock with transparent cash prices, instant installment financing, and verified motor & battery specs.
            </p>

            {/* Quick Stats Pill Banner */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border text-xs font-semibold shadow-xs">
                <Bike className="size-4 text-blue-500" />
                <span>{totalInStock} EV Bikes In Stock</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border text-xs font-semibold shadow-xs">
                <ShieldCheck className="size-4 text-emerald-500" />
                <span>Battery & Motor Warranty</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border text-xs font-semibold shadow-xs">
                <Zap className="size-4 text-cyan-500" />
                <span>Fast Smart Charger Included</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="#stock">
                <Button size="lg" className="w-full sm:w-auto px-8 bg-primary text-primary-foreground shadow-md">
                  Browse Available EV Bikes ({totalInStock})
                  <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </a>
              {organization.phone && (
                <a href={`tel:${organization.phone}`}>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
                    <Phone className="mr-2 size-4 text-blue-500" />
                    Call Showroom Desk
                  </Button>
                </a>
              )}
            </div>
          </div>
        </section>

        {/* EV Stock Grid Section */}
        <section id="stock" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <Badge variant="outline" className="text-primary border-primary/30 mb-2">
                Live Inventory
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Electric Bikes & Scooters in Stock
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Filter by brand, model, and view live down payment and lease installment calculations.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Synced with {organization.businessName} Inventory</span>
            </div>
          </div>

          {/* Interactive Stock Grid Component */}
          <StockGrid models={stockModels} dealershipName={organization.businessName} />
        </section>

        {/* Showrooms & Branches Section */}
        {organization.branches.length > 0 && (
          <section className="py-14 bg-muted/30 border-y">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="text-center max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">
                  Showroom & Service Locations
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Visit our branches to inspect chassis numbers, arrange test drives, and complete lease documentation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                {organization.branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="p-4 rounded-xl border bg-card/60 backdrop-blur-xs space-y-2 shadow-xs"
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                      <Building2 className="size-4 text-blue-500" />
                      <span>{branch.name}</span>
                    </div>

                    {branch.location && (
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                        <span>{branch.location}</span>
                      </div>
                    )}

                    {branch.contactNumber && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t">
                        <Phone className="size-3.5 text-blue-500" />
                        <a
                          href={`tel:${branch.contactNumber}`}
                          className="hover:text-foreground font-mono"
                        >
                          {branch.contactNumber}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            <span className="font-semibold text-foreground">
              {organization.businessName}
            </span>
            <span>— Powered by Ev Sale Pos</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Dealership Staff Login
            </Link>
            <span>© 2026 {organization.businessName}. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
