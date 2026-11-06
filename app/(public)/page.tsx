import { prisma } from "@/lib/prisma"
import { StockModelItem } from "@/components/storefront/stock-grid"
import { ModernStorefrontView } from "@/components/storefront/modern-storefront-view"
import { getPublicAtherModelName } from "@/lib/public-storefront"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Zap, ArrowRight } from "lucide-react"

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
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f6] p-5 text-[#17221f]">
        <main className="w-full max-w-lg rounded-3xl border border-black/[0.07] bg-white p-7 text-center shadow-sm sm:p-10">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[#e8f0ea] text-[#31584d]">
            <Zap className="size-6" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#628070]">EV Sale POS</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Your showroom is getting ready.</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#69756e]">
            No active dealership showroom is available yet. Sign in to set up your dealership.
          </p>
          <Link href="/login" className="mt-7 inline-block">
            <Button className="h-11 rounded-full bg-[#183a34] px-5 text-white hover:bg-[#24544a]">
              Dealer login
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </Link>
        </main>
      </div>
    )
  }

  // Process Real EV Stock
  const stockModels: StockModelItem[] = organization.vehicleModels.flatMap((model) => {
    const inStockVehicles = model.vehicles
    const publicModelName = getPublicAtherModelName(model.brand, model.modelName)

    if (!publicModelName || inStockVehicles.length === 0) {
      return []
    }

    const availableColors = Array.from(
      new Set(
        inStockVehicles
          .map((v) => v.color)
          .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      )
    )

    const branchCounts = new Map<string, number>()
    for (const vehicle of inStockVehicles) {
      const branchName = vehicle.branch?.name || "Main showroom"
      branchCounts.set(branchName, (branchCounts.get(branchName) ?? 0) + 1)
    }

    return {
      brand: "Ather",
      modelName: publicModelName,
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
      stockByBranch: Array.from(branchCounts, ([branchName, count]) => ({
        branchName,
        count,
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
      branches={organization.branches.map(({ name, location, contactNumber }) => ({
        name,
        location,
        contactNumber,
      }))}
      stockModels={stockModels}
    />
  )
}
