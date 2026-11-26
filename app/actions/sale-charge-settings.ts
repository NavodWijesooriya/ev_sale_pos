"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordAudit } from "@/lib/audit"
import { requireOwner } from "@/lib/authorize"
import { prisma } from "@/lib/prisma"
import { loadSaleChargeSettings } from "@/lib/sale-charges"
import type { SaleChargeSettings } from "@/lib/validations/new-sale"

const amount = (label: string) =>
  z
    .number({ error: `${label} must be a number.` })
    .finite(`${label} must be a number.`)
    .min(0, `${label} cannot be negative.`)
    .max(10_000_000, `${label} is too large.`)

const saveSchema = z.object({
  rmvChargeFinance: amount("RMV charge (Finance)"),
  rmvChargeCash: amount("RMV charge (Cash)"),
  thirdPartyInsurance: amount("Third-party insurance"),
})

export type SaveSaleChargeSettingsInput = z.infer<typeof saveSchema>

/** Owner only. */
export async function getSaleChargeSettings(): Promise<SaleChargeSettings> {
  const owner = await requireOwner()
  return loadSaleChargeSettings(prisma, owner.organizationId)
}

/** Owner only. Applies to NEW sales: existing sales keep the amounts they were saved with. */
export async function saveSaleChargeSettings(input: SaveSaleChargeSettingsInput) {
  try {
    const owner = await requireOwner()
    const data = saveSchema.parse(input)
    const actor = { id: owner.id, name: owner.name, organizationId: owner.organizationId, branchId: owner.branchId }

    const changed = await prisma.$transaction(async (tx) => {
      const previous = await loadSaleChargeSettings(tx, owner.organizationId)
      const lines: string[] = []
      if (previous.rmvChargeFinance !== data.rmvChargeFinance) {
        lines.push(`RMV charge (Finance) ${previous.rmvChargeFinance} -> ${data.rmvChargeFinance}`)
      }
      if (previous.rmvChargeCash !== data.rmvChargeCash) {
        lines.push(`RMV charge (Cash) ${previous.rmvChargeCash} -> ${data.rmvChargeCash}`)
      }
      if (previous.thirdPartyInsurance !== data.thirdPartyInsurance) {
        lines.push(`third-party insurance ${previous.thirdPartyInsurance} -> ${data.thirdPartyInsurance}`)
      }
      if (!lines.length) return false

      await tx.commissionSettings.upsert({
        where: { organizationId: owner.organizationId },
        create: {
          organizationId: owner.organizationId,
          rmvChargeFinance: data.rmvChargeFinance,
          rmvChargeCash: data.rmvChargeCash,
          thirdPartyInsuranceAmount: data.thirdPartyInsurance,
          updatedById: owner.id,
        },
        update: {
          rmvChargeFinance: data.rmvChargeFinance,
          rmvChargeCash: data.rmvChargeCash,
          thirdPartyInsuranceAmount: data.thirdPartyInsurance,
          updatedById: owner.id,
        },
      })
      await recordAudit(tx, actor, {
        action: "SALE_CHARGE_SETTINGS_CHANGED",
        entityType: "CommissionSettings",
        entityId: owner.organizationId,
        description: lines.join("; "),
      })
      return true
    })

    revalidatePath("/dashboard/settings/sale-charges")
    revalidatePath("/dashboard/sales/new")
    return { success: true as const, message: changed ? "Sale charges saved." : "No changes to save." }
  } catch (error) {
    console.error("saveSaleChargeSettings error:", error)
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "Enter valid values.")
        : error instanceof Error
          ? error.message
          : "Could not save sale charges."
    return { success: false as const, message }
  }
}
