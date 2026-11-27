import { notFound, redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasAnyPermission, hasPermission } from "@/lib/permissions"
import { SaleOverview } from "@/components/sales/sale-overview"
import { getSaleDocuments } from "@/app/actions/documents"

export const instant = false

export const metadata = {
  title: "EV Bike Sale & DMT Registration | Ev Sale Pos",
  description: "EV bike handover, delivery note, warranty activation and DMT registration tracking",
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
      downPaymentPayments: { orderBy: { paymentDate: "asc" } },
      dmtRegistration: { include: { ownerCustomer: { select: { name: true } } } },
    },
  })

  if (!sale) {
    notFound()
  }

  // Delivery / Delivery Order / RMV documents (null when this user may not see them, or the sale is outside their branch).
  const documents = await getSaleDocuments(saleId)

  // The customer owes additional down payment when a Delivery Order was lower than the finance amount.
  const hasExtraDownPayment = sale.additionalDownPaymentDue > 0 || sale.downPaymentPayments.length > 0
  const additionalDownPayment = hasExtraDownPayment
    ? {
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        downPayment: sale.downPayment,
        originalFinanceAmount: sale.originalFinanceAmount,
        financeAmount: sale.financeAmount,
        due: sale.additionalDownPaymentDue,
        paid: sale.additionalDownPaymentPaid,
        payments: sale.downPaymentPayments.map((p) => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          paymentDate: p.paymentDate.toISOString(),
          reference: p.reference,
          receivedByName: p.receivedByName,
        })),
      }
    : null

  return (
    <SaleOverview
      sale={sale as any}
      canCancel={hasPermission(session.user, "CANCEL_SALE")}
      documents={documents.success ? documents.data : null}
      additionalDownPayment={additionalDownPayment}
      canRecordDownPayment={hasAnyPermission(session.user, ["CREATE_SALE", "MANAGE_DOCUMENTS"]) && sale.status !== "CANCELLED"}
    />
  )
}
