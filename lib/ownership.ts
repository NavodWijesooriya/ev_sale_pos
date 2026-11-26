import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { activeSale } from "@/lib/sale-status"

type Client = Prisma.TransactionClient | typeof prisma

export interface OwnerSummary {
  id: string
  name: string
  phone: string
  nic: string | null
}

export interface TransferSummary {
  id: string
  slipNumber: string
  transferDate: string
  from: OwnerSummary
  to: OwnerSummary
  reason: string | null
  transferFee: number
  staffName: string
  docTransferForm: boolean
  docNicCopies: boolean
  docRegistrationBook: boolean
  dmtOwnerUpdated: boolean
  financeWarningConfirmed: boolean
}

export interface OwnershipHistory {
  /** The sale the bike was sold in; null when the bike was never sold. */
  saleId: string | null
  originalBuyer: OwnerSummary | null
  currentOwner: OwnerSummary | null
  transfers: TransferSummary[]
}

const ownerSelect = { id: true, name: true, phone: true, nic: true } as const

/** Original buyer -> every transfer (oldest first) and the current owner of a bike. */
export async function loadOwnershipHistory(client: Client, organizationId: string, vehicleId: string): Promise<OwnershipHistory> {
  const [sale, transfers] = await Promise.all([
    client.sale.findFirst({
      where: { vehicleId, organizationId, ...activeSale },
      orderBy: { saleDate: "desc" },
      select: { id: true, customer: { select: ownerSelect } },
    }),
    client.vehicleOwnershipTransfer.findMany({
      where: { vehicleId, organizationId },
      orderBy: [{ transferDate: "asc" }, { createdAt: "asc" }],
      include: { fromCustomer: { select: ownerSelect }, toCustomer: { select: ownerSelect } },
    }),
  ])
  const rows: TransferSummary[] = transfers.map((t) => ({
    id: t.id,
    slipNumber: t.slipNumber,
    transferDate: t.transferDate.toISOString().slice(0, 10),
    from: t.fromCustomer,
    to: t.toCustomer,
    reason: t.reason,
    transferFee: t.transferFee,
    staffName: t.createdByName,
    docTransferForm: t.docTransferForm,
    docNicCopies: t.docNicCopies,
    docRegistrationBook: t.docRegistrationBook,
    dmtOwnerUpdated: t.dmtOwnerUpdated,
    financeWarningConfirmed: t.financeWarningConfirmed,
  }))
  return {
    saleId: sale?.id ?? null,
    originalBuyer: sale?.customer ?? null,
    currentOwner: rows.length ? rows[rows.length - 1].to : (sale?.customer ?? null),
    transfers: rows,
  }
}

/** Bikes a customer owns today: bought and not transferred away, plus transferred to them and not moved on. */
export async function loadOwnedVehicles(client: Client, organizationId: string, customerId: string) {
  const [bought, received] = await Promise.all([
    client.sale.findMany({
      where: { organizationId, customerId, ...activeSale },
      select: { vehicleId: true },
    }),
    client.vehicleOwnershipTransfer.findMany({
      where: { organizationId, toCustomerId: customerId },
      select: { vehicleId: true },
    }),
  ])
  const candidateIds = Array.from(new Set([...bought.map((s) => s.vehicleId), ...received.map((t) => t.vehicleId)]))
  const owned: Array<{ id: string; label: string }> = []
  for (const vehicleId of candidateIds) {
    const history = await loadOwnershipHistory(client, organizationId, vehicleId)
    if (history.currentOwner?.id !== customerId) continue
    const vehicle = await client.vehicle.findUnique({
      where: { id: vehicleId },
      select: { chassisNumber: true, status: true, vehicleModel: { select: { brand: true, modelName: true } } },
    })
    if (!vehicle || vehicle.status !== "Sold") continue
    owned.push({ id: vehicleId, label: `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName} · ${vehicle.chassisNumber}` })
  }
  return owned
}
