"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordAudit } from "@/lib/audit"
import { requireOwner } from "@/lib/authorize"
import { prisma } from "@/lib/prisma"

export interface FreeItemRow {
  id: string
  name: string
  description: string | null
  isActive: boolean
  /** Number of sales that used this item. */
  usedInSales: number
}

const itemSchema = z.object({
  name: z.string().trim().min(1, "Enter the item name.").max(80, "The name is too long (80 characters at most)."),
  description: z.string().trim().max(300, "The description is too long (300 characters at most).").optional().or(z.literal("")),
})
export type FreeItemInput = z.infer<typeof itemSchema>

function done(path = "/dashboard/settings/free-items") {
  revalidatePath(path)
  revalidatePath("/dashboard/sales/new")
}

function failure(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) return { success: false as const, error: error.issues[0]?.message ?? fallback }
  return { success: false as const, error: error instanceof Error ? error.message : fallback }
}

/** Sales that used the item: by link (new sales) or by name (sales made before the links existed). */
async function usageCount(organizationId: string, item: { id: string; name: string }) {
  return prisma.sale.count({
    where: {
      organizationId,
      OR: [{ freeItemLinks: { some: { freeItemId: item.id } } }, { freeItems: { has: item.name } }],
    },
  })
}

export async function getFreeItems(): Promise<FreeItemRow[]> {
  const owner = await requireOwner()
  const items = await prisma.freeItem.findMany({
    where: { organizationId: owner.organizationId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  })
  return Promise.all(
    items.map(async (item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      isActive: item.isActive,
      usedInSales: await usageCount(owner.organizationId, item),
    })),
  )
}

async function nameTaken(organizationId: string, name: string, exceptId?: string) {
  const clash = await prisma.freeItem.findFirst({
    where: { organizationId, name: { equals: name, mode: "insensitive" }, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  })
  return Boolean(clash)
}

export async function createFreeItem(input: FreeItemInput) {
  try {
    const owner = await requireOwner()
    const data = itemSchema.parse(input)
    if (await nameTaken(owner.organizationId, data.name)) {
      return { success: false as const, error: "A free item with this name already exists." }
    }
    const actor = { id: owner.id, name: owner.name, organizationId: owner.organizationId, branchId: owner.branchId }
    await prisma.$transaction(async (tx) => {
      const item = await tx.freeItem.create({
        data: { organizationId: owner.organizationId, name: data.name, description: data.description || null },
      })
      await recordAudit(tx, actor, {
        action: "FREE_ITEM_CREATED",
        entityType: "FreeItem",
        entityId: item.id,
        description: `Added free item "${item.name}"`,
      })
    })
    done()
    return { success: true as const }
  } catch (error) {
    console.error("createFreeItem error:", error)
    return failure(error, "Could not add the free item.")
  }
}

export async function updateFreeItem(id: string, input: FreeItemInput) {
  try {
    const owner = await requireOwner()
    const data = itemSchema.parse(input)
    const item = await prisma.freeItem.findFirst({ where: { id, organizationId: owner.organizationId } })
    if (!item) return { success: false as const, error: "Free item not found." }
    if (await nameTaken(owner.organizationId, data.name, item.id)) {
      return { success: false as const, error: "A free item with this name already exists." }
    }
    const actor = { id: owner.id, name: owner.name, organizationId: owner.organizationId, branchId: owner.branchId }
    await prisma.$transaction(async (tx) => {
      await tx.freeItem.update({ where: { id: item.id }, data: { name: data.name, description: data.description || null } })
      await recordAudit(tx, actor, {
        action: "FREE_ITEM_UPDATED",
        entityType: "FreeItem",
        entityId: item.id,
        description:
          item.name === data.name
            ? `Updated free item "${item.name}"`
            : `Renamed free item "${item.name}" to "${data.name}" (earlier sales keep the old name)`,
      })
    })
    done()
    return { success: true as const }
  } catch (error) {
    console.error("updateFreeItem error:", error)
    return failure(error, "Could not update the free item.")
  }
}

export async function setFreeItemActive(id: string, isActive: boolean) {
  try {
    const owner = await requireOwner()
    const item = await prisma.freeItem.findFirst({ where: { id, organizationId: owner.organizationId } })
    if (!item) return { success: false as const, error: "Free item not found." }
    if (item.isActive === isActive) return { success: true as const }
    const actor = { id: owner.id, name: owner.name, organizationId: owner.organizationId, branchId: owner.branchId }
    await prisma.$transaction(async (tx) => {
      await tx.freeItem.update({ where: { id: item.id }, data: { isActive } })
      await recordAudit(tx, actor, {
        action: isActive ? "FREE_ITEM_ACTIVATED" : "FREE_ITEM_DEACTIVATED",
        entityType: "FreeItem",
        entityId: item.id,
        description: `${isActive ? "Activated" : "Deactivated"} free item "${item.name}"`,
      })
    })
    done()
    return { success: true as const }
  } catch (error) {
    console.error("setFreeItemActive error:", error)
    return failure(error, "Could not change the free item.")
  }
}

export async function deleteFreeItem(id: string) {
  try {
    const owner = await requireOwner()
    const item = await prisma.freeItem.findFirst({ where: { id, organizationId: owner.organizationId } })
    if (!item) return { success: false as const, error: "Free item not found." }
    const used = await usageCount(owner.organizationId, item)
    if (used > 0) {
      return {
        success: false as const,
        error: `Used in ${used} ${used === 1 ? "sale" : "sales"}. Set it Inactive instead.`,
      }
    }
    const actor = { id: owner.id, name: owner.name, organizationId: owner.organizationId, branchId: owner.branchId }
    await prisma.$transaction(async (tx) => {
      await tx.freeItem.delete({ where: { id: item.id } })
      await recordAudit(tx, actor, {
        action: "FREE_ITEM_DELETED",
        entityType: "FreeItem",
        entityId: item.id,
        description: `Deleted free item "${item.name}"`,
      })
    })
    done()
    return { success: true as const }
  } catch (error) {
    console.error("deleteFreeItem error:", error)
    return failure(error, "Could not delete the free item.")
  }
}
