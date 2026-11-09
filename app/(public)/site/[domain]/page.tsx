import { prisma } from "@/lib/prisma"
import { VehicleStatus } from "@prisma/client"
import { DealershipNotFoundView } from "@/components/storefront/not-found-view"
import { StockModelItem } from "@/components/storefront/stock-grid"
import { ModernStorefrontView } from "@/components/storefront/modern-storefront-view"
import { getPublicAtherModelName } from "@/lib/public-storefront"

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
    title: `${org.businessName} | Electric Bikes & Scooters Sri Lanka`,
    description: `Explore live in-stock electric bikes, prices in LKR, specs, and bank leasing at ${org.businessName}.`,
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
              status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.InStock] },
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
      domain={organization.domain || normalizedDomain}
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
