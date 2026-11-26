import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  DEFAULT_RMV_CHARGE_CASH,
  DEFAULT_RMV_CHARGE_FINANCE,
  DEFAULT_THIRD_PARTY_INSURANCE,
  type SaleChargeSettings,
} from "@/lib/validations/new-sale"

type Client = Prisma.TransactionClient | typeof prisma

/** Owner-configured customer charges for NEW sales (falls back to the defaults). Existing sales keep their saved amounts. */
export async function loadSaleChargeSettings(client: Client, organizationId: string): Promise<SaleChargeSettings> {
  const settings = await client.commissionSettings.findUnique({
    where: { organizationId },
    select: { rmvChargeFinance: true, rmvChargeCash: true, thirdPartyInsuranceAmount: true },
  })
  return {
    rmvChargeFinance: settings?.rmvChargeFinance ?? DEFAULT_RMV_CHARGE_FINANCE,
    rmvChargeCash: settings?.rmvChargeCash ?? DEFAULT_RMV_CHARGE_CASH,
    thirdPartyInsurance: settings?.thirdPartyInsuranceAmount ?? DEFAULT_THIRD_PARTY_INSURANCE,
  }
}
