import { connection } from "next/server"
import { notFound, redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PrintableInvoice } from "@/components/sales/printable-invoice"

export const instant = false

export const metadata = {
  title: "EV Bike Sale Invoice & Receipt | Ev Sale Pos",
  description: "Official printable tax invoice and customer receipt for EV bike purchase",
}

interface InvoicePageProps {
  params: Promise<{
    saleId: string
  }>
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  await connection()
  const session = await getAuthSession()

  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/sales")
  }

  const { saleId } = await params

  if (!saleId) {
    notFound()
  }

  // Fetch full sale record strictly scoped to current tenant
  const sale = await prisma.sale.findFirst({
    where: {
      id: saleId,
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
              vehicleModel: {
                select: {
                  brand: true,
                  modelName: true,
                  batteryCapacity: true,
                  range: true,
                },
              },
              grn: {
                select: { grnNumber: true },
              },
            },
          },
        },
      },
      financeDetail: true,
      advancePayment: {
        select: {
          amount: true,
        },
      },
    },
  })

  // If sale does not exist or does not belong to this organization
  if (!sale) {
    notFound()
  }

  return <PrintableInvoice sale={sale} />
}
