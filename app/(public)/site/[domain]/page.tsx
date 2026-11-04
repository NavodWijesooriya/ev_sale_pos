import { prisma } from "@/lib/prisma"
import { DealershipNotFoundView } from "@/components/storefront/not-found-view"
import { StockModelItem } from "@/components/storefront/stock-grid"
import { ModernStorefrontView } from "@/components/storefront/modern-storefront-view"

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
      domain={organization.domain || normalizedDomain}
      subdomain={organization.subdomain}
      logoUrl={organization.logoUrl}
      phone={organization.phone}
      branches={organization.branches}
      stockModels={stockModels}
    />
  )
}
