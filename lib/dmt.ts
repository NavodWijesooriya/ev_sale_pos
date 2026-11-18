/**
 * DMT / RMV registration workflow rules (pure, shared by UI and server).
 *
 *   Pending ──(all 4 documents)──> DocumentsCollected ──(submitted to RMV)──> Processing
 *           ──(number plate issued + registration book + registration number)──> Completed
 *
 * The status is always DERIVED from the checklist, never typed in by hand. That keeps the
 * dashboard cards (total incomplete, missing MTA2 / NIC / photos / TIN, processing) consistent.
 */

export type DmtStatusKey = "Pending" | "DocumentsCollected" | "Processing" | "Completed"
export type PlateStatusKey = "PENDING" | "PROCESSING" | "ISSUED"

export interface DmtState {
  hasMTA2: boolean
  hasNIC: boolean
  hasPhotos: boolean
  hasTIN: boolean
  /** Documents handed in to the RMV (Department of Motor Traffic). */
  rmvSubmitted: boolean
  numberPlateStatus: PlateStatusKey
  /** Vehicle registration book (CR) received. */
  isBookOk: boolean
  isInsuranceOk: boolean
  registrationNumber: string | null
}

export const DMT_DOCUMENTS = [
  { key: "hasMTA2", label: "MTA2 form" },
  { key: "hasNIC", label: "NIC copy" },
  { key: "hasPhotos", label: "Photos" },
  { key: "hasTIN", label: "TIN" },
] as const

export function allDocumentsReceived(state: Pick<DmtState, "hasMTA2" | "hasNIC" | "hasPhotos" | "hasTIN">): boolean {
  return state.hasMTA2 && state.hasNIC && state.hasPhotos && state.hasTIN
}

/** Throws a plain-language error when the combination is impossible. */
export function assertValidDmtState(state: DmtState): void {
  if (state.rmvSubmitted && !allDocumentsReceived(state)) {
    throw new Error("Cannot submit to RMV until the MTA2 form, NIC copy, photos and TIN are all received.")
  }
  if (state.numberPlateStatus !== "PENDING" && !state.rmvSubmitted) {
    throw new Error("The number plate can only be processed or issued after the documents are submitted to RMV.")
  }
  if (state.numberPlateStatus === "ISSUED" && !state.registrationNumber) {
    throw new Error("Enter the registration number before marking the number plate as issued.")
  }
  if (state.isBookOk && (!state.rmvSubmitted || !state.registrationNumber)) {
    throw new Error("The registration book needs an RMV submission and a registration number.")
  }
}

export function deriveDmtStatus(state: DmtState): DmtStatusKey {
  if (
    allDocumentsReceived(state) &&
    state.rmvSubmitted &&
    state.numberPlateStatus === "ISSUED" &&
    state.isBookOk &&
    state.registrationNumber
  ) {
    return "Completed"
  }
  if (state.rmvSubmitted) return "Processing"
  if (allDocumentsReceived(state)) return "DocumentsCollected"
  return "Pending"
}

/** Which of the four documents are still missing (feeds the dashboard counts). */
export function missingDocuments(state: Pick<DmtState, "hasMTA2" | "hasNIC" | "hasPhotos" | "hasTIN">): string[] {
  return DMT_DOCUMENTS.filter(({ key }) => !state[key]).map(({ label }) => label)
}
