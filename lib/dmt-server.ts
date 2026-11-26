import { DMTStatus, NumberPlateStatus } from "@prisma/client"
import { recordAudit } from "@/lib/audit"
import type { AuthSessionUser } from "@/lib/auth"
import {
  assertValidDmtState,
  deriveDmtStatus,
  type DmtState,
  type DmtStatusKey,
  type PlateStatusKey,
} from "@/lib/dmt"
import { branchFilter } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { activeSale } from "@/lib/sale-status"

export interface DmtPatch {
  hasMTA2?: boolean
  hasNIC?: boolean
  hasPhotos?: boolean
  hasTIN?: boolean
  rmvSubmitted?: boolean
  numberPlateStatus?: PlateStatusKey
  isBookOk?: boolean
  isInsuranceOk?: boolean
  registrationNumber?: string | null
  /** Legacy inputs kept so older screens keep working; both are mapped onto the workflow. */
  isNumberPlateOk?: boolean
  status?: DmtStatusKey
}

const FIELD_LABELS: Record<string, string> = {
  hasMTA2: "MTA2",
  hasNIC: "NIC",
  hasPhotos: "photos",
  hasTIN: "TIN",
  rmvSubmitted: "RMV submitted",
  numberPlateStatus: "number plate",
  isBookOk: "registration book",
  isInsuranceOk: "insurance",
  registrationNumber: "registration no.",
}

/**
 * The single place a sale's DMT / RMV record is changed. It merges the patch into the stored
 * record, rejects impossible combinations, DERIVES the status, saves, and writes an audit entry
 * in one transaction. Branch-assigned users can only touch sales of their own branch.
 */
export async function applyDmtPatch(
  user: AuthSessionUser & { organizationId: string },
  saleId: string,
  patch: DmtPatch,
) {
  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, organizationId: user.organizationId, ...branchFilter(user), ...activeSale },
      select: { id: true, branchId: true, customerId: true, invoiceNumber: true, items: { select: { vehicleId: true } } },
    })
    if (!sale) throw new Error("Sale not found in your dealership records.")

    const existing = await tx.dMTRegistration.findUnique({ where: { saleId } })

    const before: DmtState = {
      hasMTA2: existing?.hasMTA2 ?? false,
      hasNIC: existing?.hasNIC ?? false,
      hasPhotos: existing?.hasPhotos ?? false,
      hasTIN: existing?.hasTIN ?? false,
      rmvSubmitted: existing ? existing.status === DMTStatus.Processing || existing.status === DMTStatus.Completed : false,
      numberPlateStatus: (existing?.numberPlateStatus ?? "PENDING") as PlateStatusKey,
      isBookOk: existing?.isBookOk ?? false,
      isInsuranceOk: existing?.isInsuranceOk ?? false,
      registrationNumber: existing?.registrationNumber ?? existing?.registeredNumber ?? null,
    }

    const next: DmtState = { ...before }
    for (const key of ["hasMTA2", "hasNIC", "hasPhotos", "hasTIN", "isBookOk", "isInsuranceOk"] as const) {
      if (patch[key] !== undefined) next[key] = patch[key] as boolean
    }
    if (patch.registrationNumber !== undefined) {
      const trimmed = patch.registrationNumber?.trim().toUpperCase() ?? ""
      next.registrationNumber = trimmed || null
    }

    // Legacy status input -> RMV submission flag
    if (patch.status !== undefined) {
      next.rmvSubmitted = patch.status === "Processing" || patch.status === "Completed"
    }
    if (patch.rmvSubmitted !== undefined) next.rmvSubmitted = patch.rmvSubmitted

    // Number plate: workflow status is the source of truth; the legacy boolean maps onto it.
    if (patch.numberPlateStatus !== undefined) {
      next.numberPlateStatus = patch.numberPlateStatus
    } else if (patch.isNumberPlateOk !== undefined) {
      next.numberPlateStatus = patch.isNumberPlateOk
        ? "ISSUED"
        : before.numberPlateStatus === "ISSUED"
          ? next.rmvSubmitted
            ? "PROCESSING"
            : "PENDING"
          : before.numberPlateStatus
    }

    assertValidDmtState(next)
    const status = deriveDmtStatus(next)
    if (patch.status === "Completed" && status !== "Completed") {
      throw new Error(
        "Cannot mark as Completed yet: it needs all four documents, RMV submission, the number plate issued, the registration book and the registration number.",
      )
    }

    const dmt = await tx.dMTRegistration.upsert({
      where: { saleId },
      create: {
        saleId,
        status: status as DMTStatus,
        hasMTA2: next.hasMTA2,
        hasNIC: next.hasNIC,
        hasPhotos: next.hasPhotos,
        hasTIN: next.hasTIN,
        registeredNumber: next.registrationNumber,
        registrationNumber: next.registrationNumber,
        isBookOk: next.isBookOk,
        isNumberPlateOk: next.numberPlateStatus === "ISSUED",
        isInsuranceOk: next.isInsuranceOk,
        numberPlateStatus: next.numberPlateStatus as NumberPlateStatus,
      },
      update: {
        status: status as DMTStatus,
        hasMTA2: next.hasMTA2,
        hasNIC: next.hasNIC,
        hasPhotos: next.hasPhotos,
        hasTIN: next.hasTIN,
        registeredNumber: next.registrationNumber,
        registrationNumber: next.registrationNumber,
        isBookOk: next.isBookOk,
        isNumberPlateOk: next.numberPlateStatus === "ISSUED",
        isInsuranceOk: next.isInsuranceOk,
        numberPlateStatus: next.numberPlateStatus as NumberPlateStatus,
      },
    })

    if (next.registrationNumber !== before.registrationNumber && sale.items.length > 0) {
      await tx.vehicle.updateMany({
        where: { id: { in: sale.items.map((i) => i.vehicleId) }, organizationId: user.organizationId },
        data: { registrationNumber: next.registrationNumber },
      })
    }

    const changes = (Object.keys(FIELD_LABELS) as Array<keyof DmtState>)
      .filter((key) => before[key] !== next[key])
      .map((key) => `${FIELD_LABELS[key]}: ${String(before[key] ?? "none")} -> ${String(next[key] ?? "none")}`)
    const beforeStatus = existing?.status ?? "Pending"
    if (changes.length > 0 || beforeStatus !== status) {
      await recordAudit(
        tx,
        { id: user.id, name: user.name, organizationId: user.organizationId, branchId: user.branchId },
        {
          action: "DMT_UPDATED",
          entityType: "Sale",
          entityId: sale.id,
          branchId: sale.branchId,
          description: `${sale.invoiceNumber}: ${beforeStatus} -> ${status}${changes.length ? ` (${changes.join("; ")})` : ""}`,
        },
      )
    }

    return { dmt, status, customerId: sale.customerId, vehicleIds: sale.items.map((i) => i.vehicleId) }
  })

  return result
}

/** Pages whose numbers depend on the DMT record (kept in one place so nothing is forgotten). */
export function dmtRevalidationPaths(saleId: string, customerId: string, vehicleIds: string[]): string[] {
  return [
    "/dashboard",
    "/dashboard/reports",
    "/dashboard/customers",
    "/dashboard/customers/rmv",
    `/dashboard/customers/${customerId}`,
    `/dashboard/sales/${saleId}`,
    "/dashboard/sales",
    ...vehicleIds.map((id) => `/dashboard/bikes/${id}`),
  ]
}
