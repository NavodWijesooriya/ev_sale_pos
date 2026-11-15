import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { FULL_INSURANCE_COMMISSION } from "@/lib/validations/new-sale"

type Client = Prisma.TransactionClient | typeof prisma

/** Owner-configured fixed commission for dealership-issued Full Insurance (falls back to the default). */
export async function loadFullInsuranceCommission(client: Client, organizationId: string): Promise<number> {
  const settings = await client.commissionSettings.findUnique({
    where: { organizationId },
    select: { fullInsuranceCommission: true },
  })
  return settings?.fullInsuranceCommission ?? FULL_INSURANCE_COMMISSION
}
