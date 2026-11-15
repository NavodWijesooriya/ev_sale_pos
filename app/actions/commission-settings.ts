"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordAudit } from "@/lib/audit"
import { requireOwner } from "@/lib/authorize"
import { loadFullInsuranceCommission } from "@/lib/commission-settings"
import { prisma } from "@/lib/prisma"

export interface CommissionSettingsData {
  fullInsuranceCommission: number
  financeCompanies: { id: string; name: string; defaultCommissionRate: number | null }[]
}

const saveSchema = z.object({
  fullInsuranceCommission: z.number().finite().min(0, "Amount cannot be negative.").max(1_000_000),
  financeRates: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        rate: z.number().finite().min(0, "Rate cannot be negative.").max(100, "Rate cannot exceed 100%.").nullable(),
      }),
    )
    .max(200),
})

export type SaveCommissionSettingsInput = z.infer<typeof saveSchema>

/** Owner only. Rates here are what the sale form auto-applies; staff never see them. */
export async function getCommissionSettings(): Promise<CommissionSettingsData> {
  const owner = await requireOwner()
  const [fullInsuranceCommission, financeCompanies] = await Promise.all([
    loadFullInsuranceCommission(prisma, owner.organizationId),
    prisma.financeCompany.findMany({
      where: { organizationId: owner.organizationId },
      select: { id: true, name: true, defaultCommissionRate: true },
      orderBy: { name: "asc" },
    }),
  ])
  return { fullInsuranceCommission, financeCompanies }
}

export async function saveCommissionSettings(input: SaveCommissionSettingsInput) {
  try {
    const owner = await requireOwner()
    const data = saveSchema.parse(input)
    const actor = { id: owner.id, name: owner.name, organizationId: owner.organizationId, branchId: owner.branchId }

    const changes = await prisma.$transaction(async (tx) => {
      const lines: string[] = []

      const previousInsurance = await loadFullInsuranceCommission(tx, owner.organizationId)
      if (previousInsurance !== data.fullInsuranceCommission) {
        lines.push(`full insurance commission ${previousInsurance} -> ${data.fullInsuranceCommission}`)
      }
      await tx.commissionSettings.upsert({
        where: { organizationId: owner.organizationId },
        create: {
          organizationId: owner.organizationId,
          fullInsuranceCommission: data.fullInsuranceCommission,
          updatedById: owner.id,
        },
        update: { fullInsuranceCommission: data.fullInsuranceCommission, updatedById: owner.id },
      })

      for (const { id, rate } of data.financeRates) {
        const company = await tx.financeCompany.findFirst({
          where: { id, organizationId: owner.organizationId },
          select: { name: true, defaultCommissionRate: true },
        })
        if (!company) throw new Error("Finance company not found.")
        if ((company.defaultCommissionRate ?? null) !== rate) {
          await tx.financeCompany.update({ where: { id }, data: { defaultCommissionRate: rate } })
          lines.push(`${company.name} rate ${company.defaultCommissionRate ?? "none"}% -> ${rate ?? "none"}%`)
        }
      }

      if (lines.length) {
        await recordAudit(tx, actor, {
          action: "COMMISSION_SETTINGS_CHANGED",
          entityType: "CommissionSettings",
          entityId: owner.organizationId,
          description: lines.join("; "),
        })
      }
      return lines.length
    })

    revalidatePath("/dashboard/settings/commissions")
    revalidatePath("/dashboard/sales/new")
    revalidatePath("/dashboard/finance/companies")
    return {
      success: true as const,
      message: changes ? "Commission settings saved." : "No changes to save.",
    }
  } catch (error) {
    console.error("saveCommissionSettings error:", error)
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "Enter valid values.")
        : error instanceof Error
          ? error.message
          : "Could not save commission settings."
    return { success: false as const, message }
  }
}
