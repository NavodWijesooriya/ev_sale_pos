"use server"

import { revalidatePath } from "next/cache"
import { requireAnyPermission, requirePermission } from "@/lib/authorize"
import { allDocumentsReceived, type DmtStatusKey, type PlateStatusKey } from "@/lib/dmt"
import { applyDmtPatch, dmtRevalidationPaths, type DmtPatch } from "@/lib/dmt-server"
import { branchFilter, hasPermission } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { loadOwnershipHistory, type OwnershipHistory } from "@/lib/ownership"

export interface BikeDetails {
  id: string
  unitGrnNumber: string | null
  batch: string | null
  chassisNumber: string
  motorNumber: string | null
  chargingSerialNumber: string | null
  batterySerialNumber: string | null
  color: string | null
  year: number | null
  status: string
  model: string
  branchName: string
  /** Only for users with View inventory cost. */
  purchasePrice: number | null
  sale: null | {
    id: string
    invoiceNumber: string
    saleDate: string
    customerName: string
    customerPhone: string
    customerNic: string | null
  }
  dmt: null | {
    status: DmtStatusKey
    hasMTA2: boolean
    hasNIC: boolean
    hasPhotos: boolean
    hasTIN: boolean
    rmvSubmitted: boolean
    numberPlateStatus: PlateStatusKey
    isBookOk: boolean
    isInsuranceOk: boolean
    registrationNumber: string | null
    documentsComplete: boolean
  }
  canEditDmt: boolean
  /** Original buyer, every transfer and the current owner (only for a sold bike). */
  ownership: OwnershipHistory | null
  /** The viewer may transfer ownership of this (sold) bike. */
  canTransfer: boolean
  /** Who the DMT / RMV registration is in the name of, when it was moved by a transfer. */
  dmtOwnerName: string | null
}

/** One bike with its batch, sale and DMT / RMV record. Branch-assigned staff only see their own branch's bikes. */
export async function getBikeDetails(vehicleId: string): Promise<BikeDetails | null> {
  const user = await requireAnyPermission("CREATE_SALE", "CREATE_GRN", "VIEW_INVENTORY_COST", "MANAGE_WARRANTY_SERVICE", "TRANSFER_OWNERSHIP")

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, organizationId: user.organizationId, ...branchFilter(user) },
    include: {
      vehicleModel: { select: { brand: true, modelName: true } },
      branch: { select: { name: true } },
      grn: { select: { grnNumber: true } },
      sales: {
        take: 1,
        orderBy: { saleDate: "desc" },
        include: {
          customer: { select: { name: true, phone: true, nic: true } },
          dmtRegistration: true,
        },
      },
    },
  })
  if (!vehicle) return null

  const sale = vehicle.sales[0] ?? null
  const dmt = sale?.dmtRegistration ?? null

  return {
    id: vehicle.id,
    unitGrnNumber: vehicle.unitGrnNumber,
    batch: vehicle.grn?.grnNumber ?? null,
    chassisNumber: vehicle.chassisNumber,
    motorNumber: vehicle.motorNumber,
    chargingSerialNumber: vehicle.chargingSerialNumber,
    batterySerialNumber: vehicle.batterySerialNumber,
    color: vehicle.color,
    year: vehicle.year,
    status: vehicle.status,
    model: `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName}`,
    branchName: vehicle.branch.name,
    purchasePrice: hasPermission(user, "VIEW_INVENTORY_COST") ? vehicle.purchasePrice : null,
    sale: sale
      ? {
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          saleDate: sale.saleDate.toISOString(),
          customerName: sale.customer.name,
          customerPhone: sale.customer.phone,
          customerNic: sale.customer.nic,
        }
      : null,
    dmt: sale
      ? {
          status: (dmt?.status ?? "Pending") as DmtStatusKey,
          hasMTA2: dmt?.hasMTA2 ?? false,
          hasNIC: dmt?.hasNIC ?? false,
          hasPhotos: dmt?.hasPhotos ?? false,
          hasTIN: dmt?.hasTIN ?? false,
          rmvSubmitted: dmt ? dmt.status === "Processing" || dmt.status === "Completed" : false,
          numberPlateStatus: (dmt?.numberPlateStatus ?? "PENDING") as PlateStatusKey,
          isBookOk: dmt?.isBookOk ?? false,
          isInsuranceOk: dmt?.isInsuranceOk ?? false,
          registrationNumber: dmt?.registrationNumber ?? dmt?.registeredNumber ?? null,
          documentsComplete: dmt ? allDocumentsReceived(dmt) : false,
        }
      : null,
    canEditDmt: hasPermission(user, "CREATE_SALE"),
    ownership: sale ? await loadOwnershipHistory(prisma, user.organizationId, vehicle.id) : null,
    canTransfer: Boolean(sale) && vehicle.status === "Sold" && hasPermission(user, "TRANSFER_OWNERSHIP"),
    dmtOwnerName: dmt?.ownerCustomerId
      ? ((await prisma.customer.findUnique({ where: { id: dmt.ownerCustomerId }, select: { name: true } }))?.name ?? null)
      : null,
  }
}

export type SaveBikeDmtInput = Pick<
  DmtPatch,
  | "hasMTA2"
  | "hasNIC"
  | "hasPhotos"
  | "hasTIN"
  | "rmvSubmitted"
  | "numberPlateStatus"
  | "isBookOk"
  | "isInsuranceOk"
  | "registrationNumber"
>

/** Saves the per-bike DMT / RMV checklist. The status is derived and the dashboard cards update with it. */
export async function saveBikeDmtWorkflow(saleId: string, input: SaveBikeDmtInput) {
  try {
    const user = await requirePermission("CREATE_SALE")
    const { dmt, status, customerId, vehicleIds } = await applyDmtPatch(user, saleId, input)
    for (const path of dmtRevalidationPaths(saleId, customerId, vehicleIds)) revalidatePath(path)
    return { success: true as const, status: status as DmtStatusKey, message: `Saved. Status is now ${status}.`, dmtId: dmt.id }
  } catch (error) {
    console.error("saveBikeDmtWorkflow error:", error)
    return { success: false as const, message: error instanceof Error ? error.message : "Could not save." }
  }
}
