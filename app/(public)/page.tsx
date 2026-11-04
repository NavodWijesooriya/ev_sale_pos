import { prisma } from "@/lib/prisma"
import { StockModelItem } from "@/components/storefront/stock-grid"
import { ModernStorefrontView } from "@/components/storefront/modern-storefront-view"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Zap, ArrowRight, Bike } from "lucide-react"

export const instant = false

export const metadata = {
  title: "Ev Sale Pos | Sri Lanka EV Bike Showroom & ERP",
  description: "Live Sri Lankan EV bike showroom, localized LKR prices, instant bank leasing, and dealership management.",
}

export default async function PublicLandingPage() {
  // Fetch primary active organization and its live EV Bike models from Prisma
  const organization = await prisma.organization.findFirst({
    where: {
      subscriptionStatus: "Active",
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

  // Fallback if no active organization is in database yet
  if (!organization) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
          <Zap className="size-8" />
        </div>
        <h1 className="text-2xl font-bold">Ev Sale Pos</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-md">
          Welcome to Ev Sale Pos. No active dealership showroom is registered yet. Please log in to create your first dealership tenant.
        </p>
        <Link href="/login" className="mt-6">
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold">
            Dealer Login
            <ArrowRight className="ml-1.5 size-4" />
          </Button>
        </Link>
      </div>
    )
  }

  // Process Real EV Stock
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
      imageUrl: model.imageUrl,
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

  return (
    <ModernStorefrontView
      dealershipName={organization.businessName}
      domain={organization.domain || organization.subdomain || "evsalepos.com"}
      subdomain={organization.subdomain}
      logoUrl={organization.logoUrl}
      phone={organization.phone}
      branches={organization.branches}
      stockModels={stockModels}
    />
  )
}

