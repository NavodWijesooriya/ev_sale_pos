import { notFound, redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PrintableJobCard } from "@/components/services/printable-job-card"

export const instant = false

export const metadata = {
  title: "Service Job Card & Maintenance Record | VoltPOS EV Dealership ERP",
  description: "Official printable EV service job card, maintenance receipt and battery inspection sheet",
}

interface ServiceJobCardPageProps {
  params: Promise<{
    serviceId: string
  }>
}

export default async function ServiceJobCardPage({ params }: ServiceJobCardPageProps) {
  const session = await getAuthSession()

  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/services")
  }

  const { serviceId } = await params

  if (!serviceId) {
    notFound()
  }

  // Fetch full service record strictly scoped to current tenant
  const record = await prisma.serviceRecord.findFirst({
    where: {
      id: serviceId,
      organizationId: session.user.organizationId,
    },
    include: {
      organization: {
        select: {
          id: true,
          businessName: true,
          phone: true,
          logoUrl: true,
          domain: true,
          subdomain: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
          location: true,
          contactNumber: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          nic: true,
          email: true,
          address: true,
        },
      },
      vehicle: {
        include: {
          vehicleModel: {
            select: {
              brand: true,
              modelName: true,
              batteryCapacity: true,
              range: true,
            },
          },
        },
      },
    },
  })

  // If service record does not exist or does not belong to this organization
  if (!record) {
    notFound()
  }

  return <PrintableJobCard record={record as any} />
}
