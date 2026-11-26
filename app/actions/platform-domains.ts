"use server"

import { revalidatePath } from "next/cache"
import { recordAudit } from "@/lib/audit"
import { isReservedDomain, parseCustomDomain } from "@/lib/hosts"
import { requirePlatformAdmin } from "@/lib/platform-auth"
import { prisma } from "@/lib/prisma"

type Result = { success: true; message: string; domain: string | null } | { success: false; message: string }

/**
 * Platform admin only: sets or clears a dealership's own domain (e.g. jayakodigroup.lk).
 * The domain is validated, lower-cased, stored without "www." and must be unique across dealerships.
 * Leave `domain` empty to clear it.
 */
export async function setDealershipCustomDomain(input: { organizationId: string; domain: string | null }): Promise<Result> {
  try {
    const admin = await requirePlatformAdmin()
    const org = await prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { id: true, businessName: true, customDomain: true },
    })
    if (!org) return { success: false, message: "Dealership not found." }

    const typed = (input.domain ?? "").trim()
    let next: string | null = null
    if (typed) {
      next = parseCustomDomain(typed)
      if (!next) return { success: false, message: "Enter a valid domain such as jayakodigroup.lk (no https://, no path)." }
      if (isReservedDomain(next)) {
        return {
          success: false,
          message: "Enter the bare domain (e.g. jayakodigroup.lk), not a pos./admin. address or a platform domain. pos.<domain> is derived automatically.",
        }
      }
      const clash = await prisma.organization.findFirst({
        where: { customDomain: next, NOT: { id: org.id } },
        select: { businessName: true },
      })
      if (clash) return { success: false, message: `${next} is already assigned to ${clash.businessName}.` }
    }

    if ((org.customDomain ?? null) === next) {
      return { success: true, message: "No change.", domain: next }
    }

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({ where: { id: org.id }, data: { customDomain: next } })
      await recordAudit(
        tx,
        { id: admin.id, name: `${admin.name} (Platform Admin)`, organizationId: org.id, branchId: null },
        {
          action: "DEALERSHIP_DOMAIN_CHANGED",
          entityType: "Organization",
          entityId: org.id,
          description: next
            ? `Custom domain of ${org.businessName} set to ${next}${org.customDomain ? ` (was ${org.customDomain})` : ""}`
            : `Custom domain of ${org.businessName} cleared (was ${org.customDomain})`,
        },
      )
    })

    revalidatePath("/admin-portal")
    return {
      success: true,
      domain: next,
      message: next
        ? `${next} now belongs to ${org.businessName}. Add ${next}, www.${next} and pos.${next} in Vercel and create the DNS records.`
        : `The custom domain of ${org.businessName} was cleared.`,
    }
  } catch (error) {
    console.error("setDealershipCustomDomain error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Could not save the domain." }
  }
}
