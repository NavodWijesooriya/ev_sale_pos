import { daysSince, rmvStage, type HandoverTarget, type RmvStage } from "@/lib/documents"

const day = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : null)

export interface RmvDocumentsInfo {
  registrationNumber: string | null
  crReceivedAt: string | null
  crReceived: boolean
  crHandedOverAt: string | null
  crHandoverTarget: HandoverTarget | null
  crHandedToName: string | null
  crHandedToNic: string | null
  crHandoverReference: string | null
  crHandoverNotes: string | null
  plateReceivedAt: string | null
  plateReceived: boolean
  plateHandedOverAt: string | null
  plateHandedToName: string | null
  plateHandoverNotes: string | null
  stage: RmvStage
  /** Days the oldest received-but-not-handed-over document has been waiting. */
  waitingDays: number
  /** Who gets the documents: the CURRENT registered owner (after an ownership transfer), or the finance company for the CR. */
  currentOwner: { id: string; name: string; phone: string; nic: string | null }
  isFinance: boolean
  financeCompany: string | null
}

interface Person {
  id: string
  name: string
  phone: string
  nic: string | null
}

/** The sale fields buildRmvInfo reads (structural, so any query shape that includes them works). */
export interface RmvSaleInput {
  paymentType: string | null
  customer: Person
  financeCompany?: { name: string } | null
  financeDetail?: { financeCompany: string } | null
  items: Array<{ vehicle: { registrationNumber: string | null } }>
  dmtRegistration: {
    isBookOk: boolean
    numberPlateStatus: string
    registrationNumber: string | null
    registeredNumber: string | null
    crReceivedAt: Date | null
    crHandedOverAt: Date | null
    crHandoverTarget: string | null
    crHandedToName: string | null
    crHandedToNic: string | null
    crHandoverReference: string | null
    crHandoverNotes: string | null
    plateReceivedAt: Date | null
    plateHandedOverAt: Date | null
    plateHandedToName: string | null
    plateHandoverNotes: string | null
    ownerCustomer: Person | null
  } | null
}

export function buildRmvInfo(sale: RmvSaleInput): RmvDocumentsInfo | null {
  const dmt = sale.dmtRegistration
  if (!dmt) return null
  const crReceived = dmt.isBookOk
  const plateReceived = dmt.numberPlateStatus === "ISSUED"
  const waitingSince = [
    crReceived && !dmt.crHandedOverAt ? dmt.crReceivedAt : null,
    plateReceived && !dmt.plateHandedOverAt ? dmt.plateReceivedAt : null,
  ].filter((d): d is Date => Boolean(d))
  const oldest = waitingSince.length ? new Date(Math.min(...waitingSince.map((d) => d.getTime()))) : null
  const owner = dmt.ownerCustomer ?? sale.customer
  return {
    registrationNumber: dmt.registrationNumber ?? dmt.registeredNumber ?? sale.items[0]?.vehicle.registrationNumber ?? null,
    crReceivedAt: day(dmt.crReceivedAt),
    crReceived,
    crHandedOverAt: day(dmt.crHandedOverAt),
    crHandoverTarget: (dmt.crHandoverTarget as HandoverTarget | null) ?? null,
    crHandedToName: dmt.crHandedToName,
    crHandedToNic: dmt.crHandedToNic,
    crHandoverReference: dmt.crHandoverReference,
    crHandoverNotes: dmt.crHandoverNotes,
    plateReceivedAt: day(dmt.plateReceivedAt),
    plateReceived,
    plateHandedOverAt: day(dmt.plateHandedOverAt),
    plateHandedToName: dmt.plateHandedToName,
    plateHandoverNotes: dmt.plateHandoverNotes,
    stage: rmvStage({ crReceived, crHandedOver: Boolean(dmt.crHandedOverAt), plateReceived, plateHandedOver: Boolean(dmt.plateHandedOverAt) }),
    waitingDays: daysSince(oldest),
    currentOwner: { id: owner.id, name: owner.name, phone: owner.phone, nic: owner.nic },
    isFinance: sale.paymentType === "FINANCE",
    financeCompany: sale.financeCompany?.name ?? sale.financeDetail?.financeCompany ?? null,
  }
}
