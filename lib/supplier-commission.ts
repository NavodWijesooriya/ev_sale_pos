/**
 * Supplier monthly target commission (pure maths, shared by the server and the UI).
 *
 * The supplier pays the dealership a per-unit incentive based on how much of the monthly target was achieved:
 * the applicable slab is the one with the highest "from %" that is <= the achievement %.
 * Achievement 0% (or no target set) earns nothing.
 */

export interface CommissionSlab {
  fromPercent: number
  amountPerUnit: number
}

export const DEFAULT_SUPPLIER_SLABS: CommissionSlab[] = [
  { fromPercent: 1, amountPerUnit: 20000 },
  { fromPercent: 60, amountPerUnit: 22500 },
  { fromPercent: 70, amountPerUnit: 25000 },
  { fromPercent: 80, amountPerUnit: 27500 },
  { fromPercent: 90, amountPerUnit: 30000 },
  { fromPercent: 100, amountPerUnit: 32500 },
]

export interface SupplierCommissionFigures {
  targetUnits: number
  unitsSold: number
  /** units sold / target x 100 (0 when there is no target). Rounded to 2 decimals. */
  achievementPercent: number
  /** The slab that applied, or null when nothing is earned. */
  slab: CommissionSlab | null
  amountPerUnit: number
  totalCommission: number
}

/** Highest slab whose "from %" is <= the achievement (compared without floating point error). */
export function pickSlab(slabs: readonly CommissionSlab[], unitsSold: number, targetUnits: number): CommissionSlab | null {
  if (targetUnits <= 0 || unitsSold <= 0) return null
  let best: CommissionSlab | null = null
  for (const slab of slabs) {
    // unitsSold / targetUnits * 100 >= fromPercent  <=>  unitsSold * 100 >= fromPercent * targetUnits
    if (unitsSold * 100 >= slab.fromPercent * targetUnits && (!best || slab.fromPercent > best.fromPercent)) best = slab
  }
  return best
}

export function computeSupplierCommission(
  slabs: readonly CommissionSlab[],
  unitsSold: number,
  targetUnits: number,
): SupplierCommissionFigures {
  const achievementPercent = targetUnits > 0 ? Math.round((unitsSold / targetUnits) * 10000) / 100 : 0
  const slab = pickSlab(slabs, unitsSold, targetUnits)
  const amountPerUnit = slab?.amountPerUnit ?? 0
  return { targetUnits, unitsSold, achievementPercent, slab, amountPerUnit, totalCommission: unitsSold * amountPerUnit }
}

/** "60%+ → Rs. 22,500" style text for the slab that applied. */
export function slabLabel(slab: CommissionSlab | null): string {
  if (!slab) return "No slab"
  return `${slab.fromPercent}%+ → Rs. ${slab.amountPerUnit.toLocaleString("en-LK")}`
}

export interface SlabValidationInput {
  fromPercent: number
  amountPerUnit: number
}

/** Returns an error message, or null when the slab list is valid. */
export function validateSlabs(slabs: readonly SlabValidationInput[]): string | null {
  if (slabs.length === 0) return "Keep at least one slab."
  const seen = new Set<number>()
  for (const slab of slabs) {
    if (!Number.isFinite(slab.fromPercent) || slab.fromPercent <= 0) return "Each \"from %\" must be greater than 0."
    if (slab.fromPercent > 1000) return "A \"from %\" cannot be more than 1000."
    if (!Number.isFinite(slab.amountPerUnit) || slab.amountPerUnit < 0) return "Each commission per unit must be 0 or more."
    if (seen.has(slab.fromPercent)) return `The "from %" value ${slab.fromPercent} is used twice. Each slab needs a different "from %".`
    seen.add(slab.fromPercent)
  }
  return null
}
