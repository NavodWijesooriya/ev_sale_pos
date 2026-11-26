import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type Client = Prisma.TransactionClient | typeof prisma

/** What every new dealership starts with (the owner can change the list in Settings > Free Items). */
export const DEFAULT_FREE_ITEM_NAMES = ["Helmet", "Jacket", "Carpet", "Number Plate Holder", "Key Tag"] as const

export async function seedDefaultFreeItems(client: Client, organizationId: string) {
  await client.freeItem.createMany({
    data: DEFAULT_FREE_ITEM_NAMES.map((name) => ({ organizationId, name })),
    skipDuplicates: true,
  })
}

/** Items offered on a NEW sale: active ones only. */
export async function loadActiveFreeItems(client: Client, organizationId: string) {
  return client.freeItem.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}
