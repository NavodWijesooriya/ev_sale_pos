import { notFound, redirect } from "next/navigation"
import { UserRole } from "@prisma/client"
import { getAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PrintableJobCard } from "@/components/services/printable-job-card"
import type { ServiceJobCardData } from "@/components/services/printable-job-card"

export const instant = false

export const metadata = {
  title: "EV Bike Service Job Card | Ev Sale Pos",
  description: "Official printable EV bike service job card, maintenance receipt and battery inspection sheet",
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
  if (
    session.user.role !== UserRole.OrgAdmin &&
    session.user.role !== UserRole.Technician
  ) {
    redirect("/dashboard")
  }
  const authUser = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      organizationId: session.user.organizationId,
      isActive: true,
    },
    select: { role: true, branchId: true },
  })
  if (
    !authUser ||
    (authUser.role !== UserRole.OrgAdmin &&
      authUser.role !== UserRole.Technician) ||
    (authUser.role === UserRole.Technician && !authUser.branchId)
  ) {
    redirect("/dashboard")
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
      ...(authUser.role === UserRole.Technician
        ? { branchId: authUser.branchId! }
        : {}),
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
      serviceJob: {
        include: {
          parts: {
            include: {
              sparePart: {
                select: { id: true, name: true, sku: true },
              },
            },
            orderBy: { sparePart: { name: "asc" } },
          },
        },
      },
    },
  })

  // If service record does not exist or does not belong to this organization
  if (!record) {
    notFound()
  }

  return <PrintableJobCard record={record as ServiceJobCardData} />
}
