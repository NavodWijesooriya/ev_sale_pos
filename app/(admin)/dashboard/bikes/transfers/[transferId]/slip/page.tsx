import { connection } from "next/server"
import { notFound } from "next/navigation"
import { TransferSlip } from "@/components/bikes/transfer-slip"
import { requireAnyPermission } from "@/lib/authorize"
import { prisma } from "@/lib/prisma"
import { branchFilter } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Ownership Transfer Slip | Ev Sale Pos",
  description: "Printable acknowledgement of a bike ownership transfer",
}

export default async function TransferSlipPage({ params }: { params: Promise<{ transferId: string }> }) {
  await connection()
  const user = await requireAnyPermission("TRANSFER_OWNERSHIP", "CREATE_SALE", "MANAGE_CUSTOMERS")
  const { transferId } = await params

  const transfer = await prisma.vehicleOwnershipTransfer.findFirst({
    where: { id: transferId, organizationId: user.organizationId, vehicle: { ...branchFilter(user) } },
    include: {
      organization: { select: { businessName: true, phone: true } },
      vehicle: {
        select: {
          id: true,
          chassisNumber: true,
          motorNumber: true,
          batterySerialNumber: true,
          vehicleModel: { select: { brand: true, modelName: true } },
        },
      },
      fromCustomer: { select: { name: true, nic: true, phone: true, address: true } },
      toCustomer: { select: { name: true, nic: true, phone: true, address: true } },
    },
  })
  if (!transfer) notFound()

  const sale = transfer.saleId
    ? await prisma.sale.findUnique({
        where: { id: transfer.saleId },
        select: { dmtRegistration: { select: { registrationNumber: true, registeredNumber: true } } },
      })
    : null

  return (
    <TransferSlip
      data={{
        slipNumber: transfer.slipNumber,
        transferDate: transfer.transferDate.toISOString().slice(0, 10),
        reason: transfer.reason,
        transferFee: transfer.transferFee,
        staffName: transfer.createdByName,
        docTransferForm: transfer.docTransferForm,
        docNicCopies: transfer.docNicCopies,
        docRegistrationBook: transfer.docRegistrationBook,
        dmtOwnerUpdated: transfer.dmtOwnerUpdated,
        financeWarningConfirmed: transfer.financeWarningConfirmed,
        organization: transfer.organization,
        vehicle: {
          id: transfer.vehicle.id,
          model: `${transfer.vehicle.vehicleModel.brand} ${transfer.vehicle.vehicleModel.modelName}`,
          chassisNumber: transfer.vehicle.chassisNumber,
          motorNumber: transfer.vehicle.motorNumber,
          batterySerialNumber: transfer.vehicle.batterySerialNumber,
          registrationNumber: sale?.dmtRegistration?.registrationNumber ?? sale?.dmtRegistration?.registeredNumber ?? null,
        },
        from: transfer.fromCustomer,
        to: transfer.toCustomer,
      }}
    />
  )
}
