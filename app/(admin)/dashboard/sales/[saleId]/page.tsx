import { notFound, redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SaleOverview } from "@/components/sales/sale-overview"

export const instant = false

export const metadata = {
  title: "Sale Overview & DMT Registration | Ev Sale Pos",
  description: "Vehicle handover, delivery note, warranty activation and DMT registration tracking",
}

interface SalePageProps {
  params: Promise<{
    saleId: string
  }>
}

export default async function SaleDetailPage({ params }: SalePageProps) {
  const session = await getAuthSession()

  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/sales")
  }

  const { saleId } = await params

  if (!saleId) {
    notFound()
  }

  const sale = await prisma.sale.findFirst({
    where: {
      id: saleId,
      organizationId: session.user.organizationId,
    },
    include: {
      organization: {
        select: {
          businessName: true,
          phone: true,
          logoUrl: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
          location: true,
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
      soldBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      items: {
        include: {
          vehicle: {
            include: {
              vehicleModel: true,
            },
          },
        },
      },
      financeDetail: true,
      dmtRegistration: true,
    },
  })

  if (!sale) {
    notFound()
  }

  return <SaleOverview sale={sale as any} />
}
